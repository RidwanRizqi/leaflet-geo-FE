import re

file_path = 'D:/BPRD/leaflet-geo/leaflet-geo-FE/src/app/features/pbjt-assessment/components/assessment-form/assessment-form.component.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Remove step 3 form property
code = re.sub(r'step3Form!: FormGroup;\n', '', code)
code = re.sub(r'showSampleMethod: boolean = true;\n', '', code)
code = re.sub(r'showMenuMethod: boolean = true;\n', '', code)

# Remove step 3 initialization in initializeForms
step3_init_pattern = re.compile(r'// Initially toggle both methods.*?// Step 3: Observations.*?this\.step3Form = this\.fb\.group\(\{\s*observations: this\.fb\.array\(\[\]\)\s*\}\);', re.DOTALL)
code = step3_init_pattern.sub('', code)

code = code.replace('this.showSampleMethod = true;', '')
code = code.replace('this.showMenuMethod = true;', '')

# Fix initializeForms closing brace
code = re.sub(r'(surveyorId: \['', Validators\.required\]  // Required by backend\s*\n\s*\}\);)', r'\1\n  }', code)

# Remove observations getters and methods
obs_get_pattern = re.compile(r'get observations\(\): FormArray \{.*?\n  \}', re.DOTALL)
code = obs_get_pattern.sub('', code)

create_obs_pattern = re.compile(r'createObservationFormGroup\(\): FormGroup \{.*?\n  \}', re.DOTALL)
code = create_obs_pattern.sub('', code)

create_sample_tx_pattern = re.compile(r'createSampleTransactionFormGroup\(\): FormGroup \{.*?\n  \}', re.DOTALL)
code = create_sample_tx_pattern.sub('', code)

add_obs_pattern = re.compile(r'addObservation\(\): void \{.*?\n  \}', re.DOTALL)
code = add_obs_pattern.sub('', code)

remove_obs_pattern = re.compile(r'removeObservation\(index: number\): void \{.*?\n  \}', re.DOTALL)
code = remove_obs_pattern.sub('', code)

add_sample_tx_pattern = re.compile(r'addSampleTransaction\(obsIndex: number\): void \{.*?\n  \}', re.DOTALL)
code = add_sample_tx_pattern.sub('', code)

remove_sample_tx_pattern = re.compile(r'removeSampleTransaction\(obsIndex: number, txIndex: number\): void \{.*?\n  \}', re.DOTALL)
code = remove_sample_tx_pattern.sub('', code)

# Remove patch step 3 observations
patch_step3_pattern = re.compile(r'// Patch Step 3 - Observations.*?this\.observations\.push\(obsGroup\);\n\s*\}\);\n\s*\}', re.DOTALL)
code = patch_step3_pattern.sub('', code)

# Remove Check Step 3 errors (observations)
check_errors_pattern = re.compile(r'// Check Step 3 errors \(observations\).*?if \(errors\.length > 0\)', re.DOTALL)
code = check_errors_pattern.sub('if (errors.length > 0)', code)

# Remove markFormGroupTouched(this.step3Form)
code = code.replace('this.markFormGroupTouched(this.step3Form);', '')

# Remove calculateEstimates() and calculatePotency()
calc_est_pattern = re.compile(r'/\*\*.*?Calculate estimates before submitting.*?\*/\s*calculateEstimates\(\): void \{.*?\n  \}\n', re.DOTALL)
code = calc_est_pattern.sub('', code)

calc_pot_pattern = re.compile(r'calculatePotency\(\): void \{.*?\n  \}\n', re.DOTALL)
code = calc_pot_pattern.sub('', code)

# Remove calculateMethods method from TS? No, it doesn't exist. Wait, let's look for any other calculate methods
code = re.sub(r'toggleMethod\(event: any, method: string\): void \{.*?\n  \}', '', code, flags=re.DOTALL)

# Remove step 3 related stuff from prepareRequest
prep_req_pattern = re.compile(r'// Format observations.*?const observations = this\.showSampleMethod.*?return request;', re.DOTALL)
code = prep_req_pattern.sub('return request;', code)

# Clean up multiple empty lines
code = re.sub(r'\n{3,}', r'\n\n', code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Modification done!")
