# 📱 WhatsApp Business API — Configuration Sophia-Pad

## 🔐 Identifiants Meta / WhatsApp

| Clé | Valeur |
|---|---|
| **App Meta** | sophia.capferret |
| **App ID** | `1460885975437591` |
| **Numéro de téléphone** | `15558823129` |
| **Phone Number ID** | `1019869291203029` |
| **WhatsApp Access Token** | ⚠️ À générer (permanent, pas le temp 24h) |

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

### ⏳ 4. Templates WhatsApp (À FAIRE)
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

### ⏳ 5. Access Token permanent (À FAIRE)
Le token temporaire de l'API Setup expire en 24h. Pour un token permanent :
1. Va dans Meta Business → System Users
2. Crée un System User (admin)
3. Assigne-le à l'app `sophia.capferret`
4. Génère un token avec les permissions :
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Ce token n'expire pas → utilise-le dans n8n

### ⏳ 6. Configurer n8n (À FAIRE)
1. **Importer** `n8n-workflow-whatsapp.json` dans n8n
2. **Remplacer les placeholders** dans les nodes :
   - `VOTRE_PHONE_NUMBER_ID` → `1019869291203029`
   - `VOTRE_WHATSAPP_ACCESS_TOKEN` → le token permanent (étape 5)
   - `VOTRE_SUPABASE_ANON_KEY` → ton anon key Supabase
   - `VOTRE_SUPABASE_SERVICE_ROLE_KEY` → ton service role key Supabase
3. **Créer les credentials HTTP Header Auth** dans n8n :
   - Un pour Supabase (apikey + Authorization Bearer)
   - Un pour WhatsApp (Authorization Bearer)
4. **Activer le workflow**
5. **Récupérer l'URL du webhook** (branche 3)

### ⏳ 7. Configurer le Webhook dans Meta (À FAIRE)
1. Meta Business → WhatsApp → Configuration → Webhook
2. **Callback URL** : l'URL du webhook n8n (étape 6.5)
3. **Verify Token** : un mot de passe que tu choisis
4. **S'abonner aux événements** : `messages` (pour recevoir les réponses clients)

### ⏳ 8. Tester (À FAIRE)
1. Active les toggles WhatsApp dans Sophia-Pad (page Réservations, mode manager)
2. Crée une réservation de test avec ton numéro
3. Lance manuellement la branche 1 dans n8n
4. Tu devrais recevoir le message WhatsApp
5. Réponds "Oui" ou "Non" et vérifie que la résa est mise à jour

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

## 💰 Coûts estimés

| Poste | Coût |
|---|---|
| Meta Business Account | Gratuit |
| WhatsApp Business API | 1000 conversations service/mois gratuites |
| Au-delà de 1000 | ~0.04€/conversation utility, ~0.07€/marketing |
| n8n | Gratuit (self-hosted) ou selon ton plan cloud |

---

## 🔧 Dépannage

- **Template refusé par Meta** : Vérifie qu'il n'y a pas de contenu spam, reformule si besoin
- **Message pas reçu** : Vérifie le Phone Number ID et le token dans n8n
- **Webhook ne marche pas** : Vérifie que l'URL est accessible publiquement (HTTPS requis)
- **Réponse client non détectée** : Vérifie les mots-clés dans le node "Parser la réponse" du workflow

