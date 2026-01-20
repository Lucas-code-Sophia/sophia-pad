import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { itemId, offerQuantity, serverId, complimentaryReason } = await request.json()
    const supabase = await createClient()

    // Récupérer l'item original
    const { data: originalItem, error: fetchError } = await supabase
      .from("order_items")
      .select("*")
      .eq("id", itemId)
      .single()

    if (fetchError || !originalItem) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 })
    }

    // Calculer la quantité restante (non payée)
    // Note: paid_quantity est calculé depuis payment_items, pas stocké en BDD
    // Pour la version simple, on considère que tout est disponible
    const remainingQuantity = originalItem.quantity
    
    // Valider qu'on ne peut pas offrir plus que ce qui reste
    if (offerQuantity > remainingQuantity) {
      return NextResponse.json({ 
        error: `Impossible d'offrir ${offerQuantity} articles. Seulement ${remainingQuantity} disponible(s) non payé(s)` 
      }, { status: 400 })
    }

    if (offerQuantity <= 0) {
      return NextResponse.json({ error: "La quantité offerte doit être supérieure à 0" }, { status: 400 })
    }

    // CAS SPÉCIAL : Article simple (quantity = 1) -> juste marquer comme offert
    if (originalItem.quantity === 1 && offerQuantity === 1) {
      const { error: updateError } = await supabase
        .from("order_items")
        .update({ 
          is_complimentary: true,
          complimentary_reason: complimentaryReason || "Offert à l'addition"
        })
        .eq("id", itemId)

      if (updateError) {
        return NextResponse.json({ error: "Erreur lors du marquage comme offert" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        simpleOffer: true,
        updatedItem: { ...originalItem, is_complimentary: true, complimentary_reason: complimentaryReason || "Offert à l'addition" }
      })
    }

    // CAS NORMAL : Split pour quantités > 1
    // Réduire la quantité de l'item original
    const newOriginalQuantity = originalItem.quantity - offerQuantity
    const { error: updateError } = await supabase
      .from("order_items")
      .update({ quantity: newOriginalQuantity })
      .eq("id", itemId)

    if (updateError) {
      return NextResponse.json({ error: "Erreur lors de la mise à jour de l'article original" }, { status: 500 })
    }

    // Créer le nouvel item offert
    const { data: complimentaryItem, error: insertError } = await supabase
      .from("order_items")
      .insert({
        order_id: originalItem.order_id,
        menu_item_id: originalItem.menu_item_id,
        cart_item_id: originalItem.cart_item_id,
        quantity: offerQuantity,
        price: originalItem.price,
        status: originalItem.status,
        course_number: originalItem.course_number,
        notes: originalItem.notes,
        is_complimentary: true,
        complimentary_reason: complimentaryReason || "Offert à l'addition",
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      // Rollback: restaurer la quantité originale
      await supabase
        .from("order_items")
        .update({ quantity: originalItem.quantity })
        .eq("id", itemId)
      
      return NextResponse.json({ error: "Erreur lors de la création de l'article offert" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      simpleOffer: false,
      originalItem: { ...originalItem, quantity: newOriginalQuantity },
      complimentaryItem
    })

  } catch (error) {
    console.error("[v0] Error in split API:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

/*
 * CAS COMPLEXES À SURVEILLER (version simple ne gère pas) :
 * 
 * 1. CONCURRENCE MULTI-UTILISATEURS:
 *    - Serveur A et Serveur B modifient le même item en même temps
 *    - Solution: Lock BDD ou validation stricte des quantités
 * 
 * 2. ANNULER OFFRE AVEC PAIEMENTS PARTIELS:
 *    - Item payant: 3x (1 déjà payé) + Item offert: 2x
 *    - Si on annule l'offre, comment gérer la fusion avec le paiement existant?
 *    - Solution: Fusionner seulement les quantités non payées
 * 
 * 3. FUSIONS MULTIPLES:
 *    - Plusieurs splits successifs créent plusieurs items
 *    - Comment regrouper intelligemment?
 *    - Solution: Algorithme de fusion basé sur menu_item_id + status + is_complimentary
 * 
 * 4. ÉTATS DE LA CUISINE:
 *    - Si l'item est "fired", le split affecte-t-il la cuisine?
 *    - Actuellement: Non, mais à surveiller
 * 
 * 5. SUPPLÉMENTS OFFERTS:
 *    - Logique similaire mais table différente (supplements)
 *    - Nécessite API séparée ou adaptation
 */
