info:
    $(info `make` will perform patient generation for the number of specified patients)

PATIENT_COUNTS := 10 20 30

# Prevents the presence of a directory with the same name
.PHONY: generate-patients

generate-patients:
	cd ../../../synthea && \
	for num in 10 20 30 ; do \
		COUNT=$${num} ; \
		./run_synthea -a 18-75 -p $$COUNT -m "CMS122*" --exporter.use_uuid_filenames=true --exporter.groups.fhir.export=true \
		--exporter.fhir.export=true --exporter.fhir.transaction_bundle=true \
		--exporter.baseDirectory=cms122-$$COUNT-patients; \
	done