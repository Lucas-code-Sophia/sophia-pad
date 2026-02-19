# 🚨 CRITICAL TODO - MODULE COMMANDE

## ⚠️ TESTS OBLIGATOIRES AVANT PRODUCTION

### 🎯 Module Commande (Cœur métier)

#### 🔴 Tests Critiques - Peuvent casser le service
1. **RACE CONDITIONS MULTI-SERVEURS**
   - Scénario: 2 serveurs modifient même article/table en même temps
   - Test: Table 5 - Serveur A ajoute 2x Pizza, Serveur B modifie quantité
   - Vérifier: Pas d'écrasement, état final cohérent, BDD intacte

2. **SYNCHRONISATION STATUS BDD**
   - Scénario: Désynchronisation UI ↔ BDD
   - Test: Envoyer commande, vérifier status "fired" dans BDD
   - Vérifier: UI = BDD, pas d'états incohérents

3. **TRANSACTIONS INCOMPLÈTES**
   - Scénario: Erreur pendant création commande
   - Test: Ajouter 5x articles, couper réseau pendant envoi
   - Vérifier: Rollback complet, pas d'ordres orphelins

4. **TICKETS CUISINE**
   - Scénario: Duplication ou perte de tickets
   - Test: Envoyer commande, vérifier ticket généré une seule fois
   - Vérifier: Pas de doublons, tous les articles présents

#### 🟡 Tests Moyens - Impact service
1. **PERFORMANCE GROSSES COMMANDES**
   - Scénario: Table de 10 avec 20+ articles
   - Test: Temps de réponse, latence UI
   - Vérifier: <2s réponse, pas de freeze

2. **OFFLINE MODE**
   - Scénario: Réseau coupé pendant service
   - Test: Commander sans réseau, reconnecter
   - Vérifier: Données locales, sync au reconnection

3. **VALIDATION DONNÉES**
   - Scénario: Articles invalides, quantités négatives
   - Test: Tenter d'insérer données corrompues
   - Vérifier: Rejet côté BDD, messages erreurs

### 🎯 Module Offres (Nouveau)

#### 🔴 Tests Critiques
1. **PAIEMENTS PARTIELS + OFFRES**
   - Scénario: 3x Steak (1 payé) → Offrir 1 restant
   - Test: Offrir après paiement partiel
   - Vérifier: Calculs corrects, pas d'états incohérents

2. **FUSION COMPLEXE**
   - Scénario: Multiples splits successifs
   - Test: 5x → 3x+2x → 4x+1x → Annuler offre
   - Vérifier: Fusion correcte, quantités exactes

3. **CONCURRENCE OFFRES**
   - Scénario: 2 serveurs offrent même article
   - Test: Offrir 1x en même temps
   - Vérifier: Un seul offre acceptée, autre rejetée

#### 🟡 Tests Moyens
1. **CALCUL VALEUR OFFRE**
   - Scénario: Articles avec prix différents
   - Test: Offrir 2x article à 15.50€
   - Vérifier: Valeur = 31.00€ exactement

2. **INTERFACE RESPONSIVE**
   - Scénario: Dialog offre sur mobile
   - Test: Ouverture/fermeture dialog mobile
   - Vérifier: Utilisable, pas de bugs UX

## 📋 SCÉNARIOS DE TEST OBLIGATOIRES

### Scénario 1: Service Standard
```
Table 3 - Serveur A
1. Ajouter 2x Steak (15€) + 1x Frites (8€)
2. Mettre 1x Steak "À suivre"
3. Envoyer commande → Vérifier ticket cuisine
4. Status BDD: 1x Steak=fired, 1x Steak=to_follow_1, 1x Frites=fired
5. Envoyer "À suivre" → Status: tous fired
6. Cuisine marque terminé → Status: tous completed
```

### Scénario 2: Multi-Serveurs
```
Table 5 - Serveur A et B
1. A ajoute 2x Pizza, B ajoute 1x Soda (même table)
2. A envoie commande (Pizza+Soda)
3. B modifie quantité Pizza → 3x
4. Vérifier: Pas de conflit, état final = 3x Pizza + 1x Soda
5. BDD: Un seul order, 4 order_items corrects
```

### Scénario 3: Offres Complexes
```
Table 7 - Serveur A
1. Commander 5x Salade (10€)
2. Offrir 2x → 3x payant + 2x offert
3. Payer 1x payant → 2x payant (1 payé) + 2x offert
4. Annuler offre → 4x payant (1 payé)
5. Vérifier: Total = 4x10€ - 1x10€ = 30€
```

## 🚨 POINTS DE VIGILANCE

### Base de Données
- **Relations**: order_id, menu_item_id toujours valides
- **Status**: Valeurs dans enum uniquement
- **Quantités**: Jamais négatives
- **Prix**: Cohérence avec menu_items

### Performance
- **Requêtes**: <500ms pour operations standards
- **UI**: Pas de freeze >2s
- **Memory**: Pas de fuites mémoire

### Sécurité
- **Permissions**: Seuls serveurs/managers peuvent modifier
- **Validation**: Input validation côté serveur
- **Transactions**: Rollback sur erreur

---
⚠️ **NE PAS METTRE EN PRODUCTION SANS CES TESTS** ⚠️

**Date**: 2026-01-19  
**Priorité**: CRITIQUE  
**Impact**: Service restaurant complet

---

## 📌 FEATURES FUTURES (À FAIRE PLUS TARD)

### 📧 Newsletter / Emailing clients
- Recontacter les clients pour des événements, menus spéciaux, soirées à thème
- Exploiter la base de numéros de téléphone des réservations
- Possible via n8n + service email (Brevo/Mailchimp gratuit) ou WhatsApp broadcast

### 🎨 Thèmes personnalisables
- Couleurs de l'interface selon le restaurant (si vente de l'app)

**Ajouté le**: 2026-02-19