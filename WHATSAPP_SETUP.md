# 📱 WhatsApp Business API — Configuration Sophia-Pad

## 🔐 Identifiants Meta / WhatsApp

| Clé | Valeur |
|---|---|
| **App Meta** | sophia.capferret |
| **App ID** | `1460885975437591` |
| **Numéro de test Meta** | `15558823129` |
| **Phone Number ID** | `1019869291203029` |
| **WhatsApp Business Account ID** | `1460885975437591` |
| **Portefeuille Business** | Sophia.capferret |
| **Nom de l'app** | Sophia Restaurant |
| **WhatsApp Access Token** | ✅ Token permanent généré (System User) |

## 🔐 Identifiants Supabase

| Clé | Valeur |
|---|---|
| **URL** | `https://geqxvlieqwrssuipypju.supabase.co` |
| **Anon Key** | Dashboard Supabase → Settings → API → `anon` key |
| **Service Role Key** | Dashboard Supabase → Settings → API → `service_role` key |

---

## 📋 Étapes de configuration

### ✅ 1. Base de données (FAIT)
- 4 colonnes ajoutées à `reservations` :
  - `whatsapp_confirmation_requested` (boolean)
  - `whatsapp_confirmation_sent` (boolean)
  - `whatsapp_review_requested` (boolean)
  - `whatsapp_review_sent` (boolean)
- Setting global dans table `settings` (clé `whatsapp_settings`)

### ✅ 2. App Sophia-Pad (FAIT)
- Toggle global dans la page Réservations (visible manager uniquement)
- Auto-application du setting global à chaque nouvelle réservation
- Badges de statut WhatsApp sur les cartes de réservation
- Boutons "Confirmer via WhatsApp" et "Demander un avis" (liens click-to-chat)

### ✅ 3. Workflow n8n (FAIT — fichier `n8n-workflow-whatsapp.json`)
- Branche 1 : Confirmation J-1 (trigger 10h)
- Branche 2 : Avis J+1 (trigger 14h)
- Branche 3 : Webhook réponses clients (temps réel)

### ✅ 3b. Webhook n8n — Contrôle des workflows (FAIT)
Chaque fois qu'un toggle WhatsApp est activé/désactivé dans l'app, un webhook est envoyé à n8n :

- **URL** : `https://n8n.srv1367878.hstgr.cloud/webhook/whatsapp-review-webhook`
- **Méthode** : POST
- **Body** :
```json
{
  "name": "whatsapp" | "review",
  "status": true | false
}
```

| Toggle dans l'app | `name` envoyé | `status` |
|---|---|---|
| Confirmation J-1 **activé** | `whatsapp` | `true` |
| Confirmation J-1 **désactivé** | `whatsapp` | `false` |
| Avis J+1 **activé** | `review` | `true` |
| Avis J+1 **désactivé** | `review` | `false` |

> Cela permet à n8n de bloquer/débloquer les workflows correspondants automatiquement.

### ✅ 4. Templates WhatsApp (FAIT — approuvés par Meta)
Soumettre ces templates dans Meta Business → WhatsApp → Message Templates :

#### Template 1 : `reservation_confirmation`
- **Catégorie** : Utility
- **Langue** : Français (fr)
- **Corps** :
```
Bonjour {{1}} 👋

📅 Rappel : Vous avez une réservation demain.
🕐 {{2}} à {{3}}
👥 {{4}} personne(s)

Pouvez-vous confirmer votre venue ?
Répondez "Oui" pour confirmer ou "Non" pour annuler.
```

#### Template 2 : `review_request`
- **Catégorie** : Marketing
- **Langue** : Français (fr)
- **Corps** :
```
Bonjour {{1}} 😊

Merci pour votre visite ! Nous espérons que vous avez passé un agréable moment.

⭐ Si vous avez apprécié, un petit avis nous ferait très plaisir !

Merci et à bientôt ! 🙏
```

> ⚠️ L'approbation des templates prend 24-48h par Meta.

### ✅ 5. Access Token permanent (FAIT)
- System User créé dans Meta Business → Paramètres → Utilisateurs système
- App `Sophia Restaurant` assignée au System User
- **WhatsApp Business Account assigné** au System User (ressource assignée)
- Token généré avec permissions :
  - `whatsapp_business_messaging`
  - `whatsapp_business_management`
- Token utilisé dans n8n (Header `Authorization: Bearer <token>`)

### ✅ 6. Configurer n8n (FAIT)
- Workflow importé et configuré avec les vrais identifiants
- Credentials HTTP créés (Supabase + WhatsApp)
- Workflow activé
- Webhook configuré

### ✅ 7. Configurer le Webhook Meta (FAIT)
- **Callback URL** : `https://n8n.srv1367878.hstgr.cloud/webhook/whatsapp-webhook`
- **Verify Token** : `metaCharLuc19`
- **Abonnements** : `messages` (pour recevoir les réponses clients)

### ✅ 8. Test de confirmation (FAIT)
- Template `reservation_confirmation` envoyé avec succès
- Marquage `whatsapp_confirmation_sent = true` dans Supabase ✅

### ⏳ 9. Ajouter le numéro fixe du restaurant (À FAIRE)
Pour utiliser le vrai numéro du restaurant (fixe ou mobile) au lieu du numéro de test Meta :

1. Va dans **Meta Business → WhatsApp → Numéros de téléphone** → **Ajouter un numéro**
2. Saisis le **numéro fixe du restaurant** (format international : `+33556XXXXXX`)
3. Choisis la vérification par **appel téléphonique** (pas SMS, puisque c'est un fixe)
4. Réponds à l'appel et note le **code de vérification**
5. Saisis le code dans Meta
6. Une fois vérifié, un **nouveau Phone Number ID** sera généré
7. **Mettre à jour** ce nouveau Phone Number ID dans :
   - Le node n8n "💬 Envoyer WhatsApp Confirmation" (URL)
   - Le node n8n "💬 Envoyer demande d'avis" (URL)
   - Ce fichier (section Identifiants ci-dessus)

> ⚠️ **Important** : Ce numéro ne pourra plus être utilisé sur WhatsApp classique ou WhatsApp Business App — il sera exclusivement lié à l'API.
> 
> ⚠️ **Nom affiché** : Tu pourras configurer le nom qui s'affiche ("Sophia Restaurant") dans Meta Business → WhatsApp → Numéros de téléphone → Profil.

---

## 📁 Fichiers concernés

| Fichier | Rôle |
|---|---|
| `n8n-workflow-whatsapp.json` | Workflow n8n complet (3 branches) |
| `app/api/settings/whatsapp/route.ts` | API settings globaux WhatsApp |
| `app/reservations/page.tsx` | UI (toggles manager, badges, boutons WhatsApp) |
| `lib/types.ts` | Types Reservation avec champs WhatsApp |
| `components/ui/radio-group.tsx` | Fix radio button blanc (pas lié WhatsApp) |

---

## 💰 Coûts estimés (tarifs effectifs juillet 2025)

Les **messages template** (initiés par le business) sont **payants par message délivré**.
Les **réponses free-form** (dans la fenêtre 24h après un message client) sont **gratuites**.

| Type de message | Catégorie | Coût/message (France) |
|---|---|---|
| Template confirmation | Utility | ~0.008 € (~0.8 ct) |
| Template avis | Marketing | ~0.015 € (~1.5 ct) |
| Réponse auto après réponse client | Service (free-form) | **Gratuit** |

| Volume mensuel | Confirmations | Avis | **Total estimé** |
|---|---|---|---|
| 0 résas | 0 € | 0 € | **0 €** |
| 100 résas | 0.80 € | 1.50 € | **~2.30 €** |
| 500 résas | 4.00 € | 7.50 € | **~11.50 €** |
| 1 000 résas | 8.00 € | 15.00 € | **~23.00 €** |

> Pas d'abonnement. 0 résas = 0 €. Tu paies uniquement les messages template délivrés.
> Les réponses automatiques après qu'un client répond sont toujours gratuites (fenêtre 24h).

| Poste | Coût |
|---|---|
| Meta Business Account | Gratuit |
| n8n | Gratuit (self-hosted) ou selon ton plan cloud |

---

## 🔧 Dépannage

- **Template refusé par Meta** : Vérifie qu'il n'y a pas de contenu spam, reformule si besoin
- **Message pas reçu** : Vérifie le Phone Number ID et le token dans n8n
- **Numéro de test** : Seuls les numéros ajoutés dans Meta → WhatsApp → API Setup → "To" peuvent recevoir des messages du numéro de test
- **"Object does not exist"** : Vérifie que le WhatsApp Business Account est assigné au System User, et que le token a le préfixe `Bearer `
- **Webhook ne marche pas** : Vérifie que l'URL est accessible publiquement (HTTPS requis) et que le workflow n8n est activé
- **Réponse client non détectée** : Vérifie les mots-clés dans le node "Parser la réponse" du workflow
- **Template "does not exist"** : Vérifie le nom exact ET la langue (ex: `en_US` vs `fr`)

