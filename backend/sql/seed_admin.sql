INSERT INTO public."Utilisateur" (
  nom,
  prenom,
  email,
  "motDePasse",
  telephone,
  role,
  actif,
  "mustChangePassword"
)
VALUES (
  'Admin',
  'FTTH',
  'admin@example.com',
  '$2b$10$vyj.G6sXfT59bD0p4k7EeOrSaBTzafOkk/gR2MAhC4UHO9s8qRJke',
  '+21600000000',
  'ADMIN',
  true,
  false
)
ON CONFLICT (email)
DO UPDATE SET
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  "motDePasse" = EXCLUDED."motDePasse",
  telephone = EXCLUDED.telephone,
  role = EXCLUDED.role,
  actif = EXCLUDED.actif,
  "mustChangePassword" = EXCLUDED."mustChangePassword";

-- Login:
-- email: admin@example.com
-- password: Password123
