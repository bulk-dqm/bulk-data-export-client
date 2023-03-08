#!/bin/bash

# test with deqm test server for testing/debugging (supports txn bundle upload)
# replace with http://localhost:3000 when testing with export server
ABACUS_URL="http://localhost:3000/4_0_1"
INFERNO_URL="http://localhost:8080/reference-server/r4"
TOKEN="SAMPLE_TOKEN"

for dir in ../../../synthea/bulk-data/*;
do
  if [ -d "$dir" ]; then
  echo 'Uploading patients in directory': "$dir";
  for bundle in $dir/fhir/*.json;
  do
    echo 'Posting bundle': "$bundle";
    curl -X POST $INFERNO_URL \
    -H "Content-Type: application/json+fhir" \
    -H "Authorization: Bearer $TOKEN" \
    -d @$bundle; \

    curl -X POST $ABACUS_URL \
    -H "Content-Type: application/json+fhir" \
    -H "Authorization: Bearer $TOKEN" \
    -d @$bundle; \
  done
  fi
done
