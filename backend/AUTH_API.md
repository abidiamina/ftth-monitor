# FTTH Monitor Auth API

Base URL locale: `http://localhost:8000/api`

## Auth

### `POST /auth/register`
Inscription publique client.

```json
{
  "nom": "Ben Sassi",
  "prenom": "Sami",
  "email": "sami@gmail.com",
  "telephone": "+21612345678",
  "adresse": "40 ali belhouane jendouba",
  "motDePasse": "Password123"
}
```

### `POST /auth/login`

```json
{
  "email": "sami@gmail.com",
  "motDePasse": "Password123"
}
```

### `GET /auth/me`
Retourne l'utilisateur courant avec ses relations utiles.

### `PATCH /auth/me`
Met a jour le profil courant.

```json
{
  "nom": "Ben Sassi",
  "prenom": "Sami",
  "telephone": "+21612345678",
  "adresse": "Nouvelle adresse client"
}
```

Note: `adresse` est obligatoire pour un client.

### `PATCH /auth/change-password`
Force le changement de mot de passe apres premiere connexion ou mise a jour volontaire.

```json
{
  "motDePasseActuel": "FTTH-ab12cd34",
  "nouveauMotDePasse": "NewPassword123"
}
```

## Admin Users

Toutes les routes ci-dessous exigent un token admin.

### `GET /users`
Parametres optionnels:
- `role=CLIENT|RESPONSABLE|TECHNICIEN|ADMIN`
- `actif=true|false`

### `GET /users/:id`
Detail d'un utilisateur.

### `POST /users/employees`
Creation d'un employe avec mot de passe temporaire et email automatique.

```json
{
  "nom": "Doe",
  "prenom": "Jane",
  "email": "jane@ftth.com",
  "telephone": "+21699888777",
  "role": "RESPONSABLE"
}
```

### `PATCH /users/:id`
Met a jour les informations de base d'un utilisateur.

```json
{
  "nom": "Doe",
  "prenom": "Jane",
  "email": "jane@ftth.com",
  "telephone": "+21699888777"
}
```

### `PATCH /users/:id/status`
Activation ou desactivation d'un compte.

```json
{
  "actif": false
}
```

### `PATCH /users/:id/reset-password`
Regenere un mot de passe temporaire pour un employe et lui renvoie par email.

### `GET /users/techniciens`
Liste utile pour l'affectation des interventions.

## Email

Si `SMTP_HOST`, `SMTP_USER` et `SMTP_PASS` ne sont pas configures, les emails ne partent pas.
Dans ce cas, les identifiants temporaires sont affiches dans les logs backend avec le prefixe `[email:fallback]`.

## Admin de test

Un script SQL est disponible dans [`sql/seed_admin.sql`](./sql/seed_admin.sql).

Identifiants de test associes:
- email: `admin@example.com`
- mot de passe: `Password123`
