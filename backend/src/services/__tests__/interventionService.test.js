const {
  validateTechnicianUpdate,
  buildStatusNotificationMessage,
  buildNotificationPayloadsForUpdate
} = require('../interventionService');

describe('Intervention Service', () => {
  describe('validateTechnicianUpdate', () => {
    const existing = {
      id: 1,
      statut: 'EN_ATTENTE',
      titre: 'Reparation Fibre',
      description: 'Coupure cable',
      adresse: '123 Rue de la Paix',
      priorite: 'NORMALE'
    };

    test('should return null for valid status update to EN_COURS', () => {
      const payload = { statut: 'EN_COURS' };
      expect(validateTechnicianUpdate({ existing, payload })).toBeNull();
    });

    test('should prevent technician from changing forbidden fields', () => {
      const payload = { titre: 'Nouveau Titre' };
      expect(validateTechnicianUpdate({ existing, payload })).toBe('Un technicien ne peut pas modifier les details ou la priorite d une intervention.');
    });

    test('should prevent finishing an intervention that is not in progress', () => {
      const payload = { statut: 'TERMINEE' };
      // existing status is EN_ATTENTE
      expect(validateTechnicianUpdate({ existing, payload })).toBe('Une intervention doit etre en cours avant d etre marquee comme terminee.');
    });

    test('should allow finishing an intervention that is in progress', () => {
      const ongoing = { ...existing, statut: 'EN_COURS' };
      const payload = { statut: 'TERMINEE' };
      expect(validateTechnicianUpdate({ existing: ongoing, payload })).toBeNull();
    });

    test('should allow a technician to refuse an intervention', () => {
      const payload = { technicienId: null, statut: 'EN_ATTENTE' };
      expect(validateTechnicianUpdate({ existing, payload })).toBeNull();
    });
  });

  describe('buildStatusNotificationMessage', () => {
    test('should return correct message for EN_COURS', () => {
      expect(buildStatusNotificationMessage('EN_COURS', 'Mission A')).toBe('L\'intervention "Mission A" est passee en cours.');
    });

    test('should return correct message for TERMINEE', () => {
      expect(buildStatusNotificationMessage('TERMINEE', 'Mission A')).toBe('L\'intervention "Mission A" a ete marquee comme terminee.');
    });
  });

  describe('buildNotificationPayloadsForUpdate', () => {
    const actor = { id: 10 };
    const before = {
      id: 1,
      titre: 'Test',
      statut: 'EN_ATTENTE',
      technicienId: 5,
      technicien: { utilisateur: { id: 50, nom: 'Tech', prenom: 'A' } },
      responsable: { utilisateur: { id: 100 } },
      client: { utilisateurId: 200 }
    };

    test('should notify participants when status changes', () => {
      const after = { ...before, statut: 'EN_COURS' };
      const payloads = buildNotificationPayloadsForUpdate(before, after, actor);
      
      // Should notify client (200), tech (50), and responsable (100)
      expect(payloads).toHaveLength(3);
      expect(payloads.some(p => p.userId === 200)).toBeTruthy();
      expect(payloads.some(p => p.userId === 50)).toBeTruthy();
      expect(payloads.some(p => p.userId === 100)).toBeTruthy();
    });

    test('should not notify the actor', () => {
      const actorIsClient = { id: 200 };
      const after = { ...before, statut: 'EN_COURS' };
      const payloads = buildNotificationPayloadsForUpdate(before, after, actorIsClient);
      
      expect(payloads.find(p => p.userId === 200)).toBeUndefined();
      expect(payloads).toHaveLength(2);
    });
  });
});
