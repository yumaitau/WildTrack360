import { describe, it, expect } from 'vitest';
import {
  NSW_SEX,
  NSW_LIFE_STAGE,
  NSW_POUCH_CONDITION,
  NSW_ANIMAL_CONDITION,
  NSW_ENCOUNTER_TYPE,
  NSW_FATE,
  isKnownNswSex,
  isKnownNswLifeStage,
  isKnownNswPouchCondition,
  isKnownNswAnimalCondition,
  isKnownNswEncounterType,
  isKnownNswFate,
} from './nsw-picklists';

describe('NSW picklist counts match the Detailed Report source', () => {
  it('Sex has the four NSW-mandated values', () => {
    expect(NSW_SEX).toEqual(['Female', 'Male', 'Hermaphrodite', 'Unknown']);
  });

  it('Life stage has the four NSW-mandated values', () => {
    expect(NSW_LIFE_STAGE).toEqual(['Adult', 'Young', 'Egg', 'Unknown']);
  });

  it('Pouch condition has six values (includes N/A for males)', () => {
    expect(NSW_POUCH_CONDITION).toHaveLength(6);
    expect(NSW_POUCH_CONDITION).toContain('N/A');
  });

  it('Animal condition has 40 values with definitions', () => {
    expect(NSW_ANIMAL_CONDITION).toHaveLength(40);
    expect(NSW_ANIMAL_CONDITION.every((i) => i.definition && i.definition.length > 0)).toBe(true);
  });

  it('Encounter type has 44 values', () => {
    expect(NSW_ENCOUNTER_TYPE).toHaveLength(44);
  });

  it('Fate has 24 values', () => {
    expect(NSW_FATE).toHaveLength(24);
  });
});

describe('picklist membership helpers', () => {
  it('isKnownNswSex matches case-insensitively', () => {
    expect(isKnownNswSex('female')).toBe(true);
    expect(isKnownNswSex('  MALE  ')).toBe(true);
    expect(isKnownNswSex('Yes')).toBe(false);
    expect(isKnownNswSex(null)).toBe(false);
  });

  it('isKnownNswLifeStage accepts the NSW values', () => {
    expect(isKnownNswLifeStage('Adult')).toBe(true);
    expect(isKnownNswLifeStage('Juvenile')).toBe(false);
  });

  it('isKnownNswPouchCondition accepts N/A', () => {
    expect(isKnownNswPouchCondition('N/A')).toBe(true);
    expect(isKnownNswPouchCondition('n/a')).toBe(true);
  });

  it('isKnownNswAnimalCondition matches the exact NSW spelling', () => {
    expect(isKnownNswAnimalCondition('Dehydrated')).toBe(true);
    expect(isKnownNswAnimalCondition('Injury to head')).toBe(true);
    expect(isKnownNswAnimalCondition('Dehydrogenated')).toBe(false);
  });

  it('isKnownNswEncounterType uses NSW casing (hyphen, title case)', () => {
    expect(isKnownNswEncounterType('Attack - Dog')).toBe(true);
    expect(isKnownNswEncounterType('Collision - Motor vehicle')).toBe(true);
    // Our legacy compliance-rules.ts uses en-dash — NSW uses ASCII hyphen.
    expect(isKnownNswEncounterType('Attack – Dog')).toBe(false);
  });

  it('isKnownNswFate recognises Euthanased by vet', () => {
    expect(isKnownNswFate('Euthanased by vet')).toBe(true);
    expect(isKnownNswFate('Released')).toBe(true);
    expect(isKnownNswFate('Eaten')).toBe(false);
  });
});
