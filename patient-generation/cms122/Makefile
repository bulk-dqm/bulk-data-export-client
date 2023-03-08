info:
    $(info `make` will perform patient generation for the number of specified patients)

PATIENT_COUNTS := 10 100 1000 #10000 20000

# Prevents the presence of a directory with the same name
.PHONY: generate-patients

generate-patients:
	cd ../../../synthea && \ 
	for num in ${PATIENT_COUNTS} ; do \
		COUNT=$${num} ; \
		./run_synthea -a 18-75 -p $$COUNT -m "CMS122*" --exporter.use_uuid_filenames=true --exporter.groups.fhir.export=true \
		--exporter.fhir.export=true --exporter.fhir.transaction_bundle=true \
		--exporter.baseDirectory=bulk-data/cms122-$$COUNT-patients; \
		--exporter.fhir.use_us_core_ig=true
	done