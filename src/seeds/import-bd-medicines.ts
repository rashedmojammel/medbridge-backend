import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Medicines } from '../medicines/medicines.entity';
import { MedicineInventory } from '../medicines/medicine-inventory.entity';
import { MedicineAlternatives } from '../medicines/medicine-alternatives.entity';

const BD_DRUG_URL =
  'https://raw.githubusercontent.com/abartoha/drug-bd-api/refs/heads/defalt/brandfile.json';

// clean up the form field - raw data has no spaces
function cleanForm(raw: string): string {
  const map: Record<string, string> = {
    Tablet: 'TABLET',
    'Tablet(SustainedRelease)': 'TABLET',
    Capsule: 'CAPSULE',
    Syrup: 'SYRUP',
    OralSuspension: 'SYRUP',
    Cream: 'CREAM',
    Gel: 'GEL',
    Injection: 'INJECTION',
    IVInjection: 'INJECTION',
    IVInfusion: 'INJECTION',
    IVInjectionorInfusion: 'INJECTION',
    IMInjection: 'INJECTION',
    SCInjection: 'INJECTION',
    OphthalmicOintment: 'OINTMENT',
    ChewableTablet: 'TABLET',
    EffervescentTablet: 'TABLET',
    OrallyDispersibleTablet: 'TABLET',
    NebuliserSolution: 'SYRUP',
    EffervescentGranules: 'GRANULES',
    DialysisSolution: 'SOLUTION',
  };
  return map[raw] || 'OTHER';
}

export async function importBdMedicines(dataSource: DataSource) {
  console.log('Fetching BD drug database...');
  const response = await fetch(BD_DRUG_URL);
  const allDrugs: any[] = await response.json();
  console.log(`Fetched ${allDrugs.length} total entries`);

  const medsRepo = dataSource.getRepository(Medicines);
  const invRepo = dataSource.getRepository(MedicineInventory);
  const altRepo = dataSource.getRepository(MedicineAlternatives);

  // track what we've already imported (by brandName + dose)
  const imported = new Map<string, Medicines>();
  // track generics for auto-linking alternatives
  const genericGroups = new Map<string, Medicines[]>();

  let importedCount = 0;
  let skippedCount = 0;

  for (const item of allDrugs) {
    const key = item.name + '|' + item.dose;

    // skip duplicates
    if (imported.has(key)) {
      skippedCount++;
      continue;
    }

    // skip if already in database
    const exists = await medsRepo.findOne({
      where: { brandName: item.name, strength: item.dose },
    });
    if (exists) {
      imported.set(key, exists);
      skippedCount++;
      continue;
    }

    const medicine = await medsRepo.save(
      medsRepo.create({
        brandName: item.name,
        genericName: item.drug,
        manufacturer: item.companyName,
        dosageForm: cleanForm(item.form),
        strength: item.dose || 'N/A',
        therapeuticClass: item.drug,
        isAvailable: true,
      }),
    );

    await invRepo.save(
      invRepo.create({
        medicine: medicine,
        stockQty: Math.floor(Math.random() * 200) + 10,
        threshold: 20,
      }),
    );

    imported.set(key, medicine);
    importedCount++;

    // group by generic name for alternatives
    const genericKey = item.drug + '|' + item.dose;
    if (!genericGroups.has(genericKey)) {
      genericGroups.set(genericKey, []);
    }
    genericGroups.get(genericKey).push(medicine);
  }

  // auto-link alternatives (same generic + same dose = interchangeable)
  let altCount = 0;
  for (const [key, group] of genericGroups) {
    if (group.length < 2) continue;
    // link first 5 of each group (to avoid thousands of pairs for common generics)
    const limited = group.slice(0, 5);
    for (let i = 0; i < limited.length; i++) {
      for (let j = i + 1; j < limited.length; j++) {
        await altRepo.save(
          altRepo.create({ medicine: limited[i], alternative: limited[j] }),
        );
        await altRepo.save(
          altRepo.create({ medicine: limited[j], alternative: limited[i] }),
        );
        altCount++;
      }
    }
  }

  console.log(
    `Import complete: ${importedCount} imported, ${skippedCount} skipped, ${altCount} alternative pairs linked`,
  );
}
