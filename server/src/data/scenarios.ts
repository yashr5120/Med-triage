import { DemoScenario } from '@triagevoice/shared';

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'scenario-resp-distress',
    name: 'Respiratory Distress',
    description: 'Fictional patient with shortness of breath and low oxygen saturation',
    transcript: `Medic 7 to base, we are inbound with a 58-year-old male. Patient found at home by family, complaining of severe shortness of breath for approximately two hours. He is diaphoretic and using accessory muscles to breathe. Vital signs: heart rate 118, blood pressure 148 over 92, oxygen saturation 84 percent on room air, respiratory rate 28. He has a history of COPD and takes albuterol as needed. Family denies any known drug allergies. We initiated oxygen via non-rebreather at 15 liters. No IV access established yet. ETA approximately eight minutes.`,
    expectedFlags: ['spo2_critical', 'tachycardia', 'tachypnea'],
  },
  {
    id: 'scenario-chest-discomfort',
    name: 'Chest Discomfort',
    description: 'Fictional patient with chest discomfort and complete vital signs',
    transcript: `Rescue 3 to emergency department, we have a 67-year-old female patient, presenting with central chest discomfort radiating to the left shoulder, onset about 40 minutes ago. Patient rates pain eight out of ten. Diaphoretic and pale. Vitals are: heart rate 94 beats per minute, blood pressure 102 over 68, oxygen saturation 96 percent on two liters nasal cannula, respiratory rate 18 per minute, temperature 36.8 Celsius. Past history includes hypertension and type 2 diabetes. Current medications lisinopril 10 milligrams daily and metformin 500 milligrams twice daily. No known drug allergies. Aspirin 325 milligrams administered orally. IV access established, normal saline at keep-open rate. 12-lead in progress. ETA six minutes.`,
    expectedFlags: ['hypotension_concern'],
  },
  {
    id: 'scenario-fall-injury',
    name: 'Fall with Possible Injury',
    description: 'Fictional patient after a fall with incomplete history',
    transcript: `Unit 12 calling in, we have an elderly female, age unknown, found on the floor by a neighbour. Appears to be in her 80s. Chief complaint is right hip pain after an unwitnessed fall. Patient is confused and unable to give a clear history. Vitals: heart rate 88, blood pressure 134 over 78, oxygen saturation 94 percent on room air, respiratory rate 16. Temperature not taken in the field. She has a medic-alert bracelet that mentions warfarin but we could not determine the dose or indication. No other history available at this time. Cervical spine precautions applied as a precaution. Backboard in place. ETA ten minutes.`,
    expectedFlags: ['age_unknown', 'warfarin_underdetermined', 'mechanism_unclear'],
  },
  {
    id: 'scenario-incomplete-handoff',
    name: 'Incomplete Handoff',
    description: 'Fictional patient with missing vitals and conflicting information',
    transcript: `Base, this is Unit 5. We have a patient, adult male, we think he is around 30 to 40 years old. He was found at the scene of a reported altercation. Chief complaint is left flank pain. Vitals were taken but our monitor malfunctioned. We could not get a reliable blood pressure. Heart rate appeared elevated, maybe 100 to 120, we are not sure. Oxygen saturation we got one reading of 97 percent but the probe kept losing signal. Respiratory rate we did not formally count. Patient says he takes some kind of blood pressure medication but he does not know the name. He claims he has no allergies but then said he reacted to something once at the hospital. Patient is alert but agitated. No interventions completed. ETA four minutes.`,
    expectedFlags: ['vitals_unreliable', 'allergy_conflict', 'medication_unknown'],
  },
];

export function getScenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find(s => s.id === id);
}
