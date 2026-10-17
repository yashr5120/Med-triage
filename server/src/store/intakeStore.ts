import { TriageIntake, IntakeStatus } from '@triagevoice/shared';

/**
 * In-memory intake store for the hackathon demo.
 * Resets on server restart. Not suitable for production.
 */

const intakeStore = new Map<string, TriageIntake>();

export function saveIntake(intake: TriageIntake): void {
  intake.updatedAt = new Date().toISOString();
  intakeStore.set(intake.intakeId, intake);
}

export function getIntake(intakeId: string): TriageIntake | undefined {
  return intakeStore.get(intakeId);
}

export function getAllIntakes(): TriageIntake[] {
  return Array.from(intakeStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function updateIntakeStatus(intakeId: string, status: IntakeStatus): TriageIntake | undefined {
  const intake = intakeStore.get(intakeId);
  if (!intake) return undefined;
  intake.status = status;
  intake.updatedAt = new Date().toISOString();
  return intake;
}

export function deleteAllIntakes(): void {
  intakeStore.clear();
}

export function getStats() {
  const all = getAllIntakes();
  return {
    total: all.length,
    awaitingReview: all.filter(i => i.status === 'extracted').length,
    confirmed: all.filter(i => i.status === 'confirmed').length,
    dispatched: all.filter(i => i.status === 'dispatched').length,
  };
}
