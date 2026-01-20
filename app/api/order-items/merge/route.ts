import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { originalItemId, complimentaryItemId } = await request.json()
    const supabase = await createClient()

    console.log("[DEBUG] Merge request:", { originalItemId, complimentaryItemId })

    // CAS SPÉCIAL : Article simple -> juste dé-marquer comme offert
    if (originalItemId === complimentaryItemId) {
      console.log("[DEBUG] Simple merge case")
      const { error: updateError } = await supabase
        .from("order_items")
        .update({ 
          is_complimentary: false,
          complimentary_reason: null
        })
        .eq("id", originalItemId)

      if (updateError) {
        console.error("[DEBUG] Simple merge error:", updateError)
        return NextResponse.json({ error: "Erreur lors de l'annulation de l'offre", details: updateError }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        simpleMerge: true,
        updatedItem: { id: originalItemId, is_complimentary: false, complimentary_reason: null }
      })
    }

    // CAS NORMAL : Fusion de deux items séparés
    console.log("[DEBUG] Normal merge case")
    // Récupérer les deux items
    const { data: items, error: fetchError } = await supabase
      .from("order_items")
      .select("*")
      .in("id", [originalItemId, complimentaryItemId])

    console.log("[DEBUG] Fetched items:", { items, fetchError })

    if (fetchError || !items || items.length !== 2) {
      console.error("[DEBUG] Items fetch error:", { fetchError, itemsLength: items?.length })
      return NextResponse.json({ error: "Articles non trouvés", details: fetchError }, { status: 404 })
    }

    const originalItem = items.find(item => item.id === originalItemId)
    const complimentaryItem = items.find(item => item.id === complimentaryItemId)

    console.log("[DEBUG] Found items:", { originalItem, complimentaryItem })

    if (!originalItem || !complimentaryItem) {
      return NextResponse.json({ error: "Articles introuvables" }, { status: 404 })
    }

    // Vérifier qu'on a bien un item payant et un item offert
    if (originalItem.is_complimentary || !complimentaryItem.is_complimentary) {
      console.error("[DEBUG] Invalid merge state:", { 
        originalIsComplimentary: originalItem.is_complimentary, 
        complimentaryIsComplimentary: complimentaryItem.is_complimentary 
      })
      return NextResponse.json({ error: "Fusion invalide: nécessite un item payant et un item offert" }, { status: 400 })
    }

    // Vérifier que les articles sont compatibles (même menu_item)
    if (originalItem.menu_item_id !== complimentaryItem.menu_item_id) {
      return NextResponse.json({ error: "Articles incompatibles: menu_item_id différent" }, { status: 400 })
    }

    // Calculer les quantités à fusionner
    const totalQuantity = originalItem.quantity + complimentaryItem.quantity
    // Note: paid_quantity est calculé, pas stocké en BDD
    // On fusionne simplement les quantités

    // Mettre à jour l'item original avec la quantité totale
    const { error: updateError } = await supabase
      .from("order_items")
      .update({ 
        quantity: totalQuantity,
        is_complimentary: false,
        complimentary_reason: null
      })
      .eq("id", originalItemId)

    if (updateError) {
      return NextResponse.json({ error: "Erreur lors de la fusion de l'article original" }, { status: 500 })
    }

    // Supprimer l'item offert
    const { error: deleteError } = await supabase
      .from("order_items")
      .delete()
      .eq("id", complimentaryItemId)

    if (deleteError) {
      // Rollback: restaurer l'état original
      await supabase
        .from("order_items")
        .update({ 
          quantity: originalItem.quantity
        })
        .eq("id", originalItemId)
      
      return NextResponse.json({ error: "Erreur lors de la suppression de l'article offert" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      simpleMerge: false,
      mergedItem: {
        ...originalItem,
        quantity: totalQuantity,
        is_complimentary: false
      }
    })

  } catch (error) {
    console.error("[v0] Error in merge API:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

/*
 * CAS COMPLEXES À SURVEILLER (version simple ne gère pas) :
 * 
 * 1. PAIEMENTS PARTIELS SUR LES DEUX ITEMS:
 *    - Original: 3x (1 payé) + Offert: 2x (0 payé)
 *    - Fusion: 5x (1 payé) - mais est-ce que ça représente bien la réalité?
 *    - Risque: Perte de précision sur les états de paiement
 * 
 * 2. STATUTS DIFFÉRENTS:
 *    - Original: "pending" + Offert: "fired"
 *    - Quel statut choisir pour l'item fusionné?
 *    - Solution: Garder le statut le plus avancé ou le plus récent
 * 
 * 3. NOTES DIFFÉRENTES:
 *    - Original: "sans oignon" + Offert: "offert pour erreur"
 *    - Comment fusionner les notes?
 *    - Solution: Concaténer ou garder la plus pertinente
 * 
 * 4. COURSE_NUMBER DIFFÉRENTS:
 *    - Items dans des services différents
 *    - Est-ce que la fusion a un sens?
 *    - Validation: Vérifier course_number identique
 * 
 * 5. HISTORIQUE PERDU:
 *    - Quand on supprime l'item offert, on perd l'historique précis
 *    - Solution: Garder trace dans un log ou conserver l'item avec un flag
 */
