// R. Barão de Pouso Alegre, 90 - São Sebastiao, Conselheiro Lafaiete - MG, 36406-034
export const TARGET_LOCATION = {
  latitude: -20.6648342,
  longitude: -43.8033635
};

export const MAX_RADIUS_KM = 3.0;
export const MAX_AUTH_ATTEMPTS = 3;
export const LOCKOUT_TIME_MS = 5 * 60 * 1000; // 5 minutes

export const USER_MOCK = {
  id: 'user-123-uuid',
  name: 'João da Silva',
  // Simple hash for demo purposes (e.g., '1234' -> hash)
  // In a real app, verify properly on backend.
  validCodes: ['1234', '0000']
};