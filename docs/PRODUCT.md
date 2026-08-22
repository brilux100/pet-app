# PupilCare product brief

## Launch

- Market: Poland
- Pilot: Gdańsk, Gdynia, Sopot and the Tricity area
- Primary users: owners of dogs and cats
- Additional profiles: rabbits, rodents, birds, reptiles, horses and other pets
- Revenue: fixed booking fee and PupilCare Premium

## Core loop

1. A pet owner opens the profile because of a question, reminder or need.
2. PupilCare understands the context through AI or a selected service.
3. The owner moves to a veterinarian, booking, service or product.
4. The completed action returns to the pet's history.

## Free plan

- Pet profiles
- Care reminders
- Vaccinations, appointments and documents
- Five pet-related AI questions per month
- Safety escalation even after the AI limit is exhausted
- Search and booking entry points

## Premium

- Expanded AI allowance and full pet context
- Full care history
- Vet 24/7 for PLN 49.99 instead of PLN 89.99
- Booking service fee of PLN 4.99 instead of PLN 9.99
- Discounts for partner services and products

Premium costs PLN 39.99 per month for the pilot.

## AI rules

- Answer only questions directly connected with a pet.
- Use the active pet profile and known history as context.
- Do not present an AI answer as a veterinary diagnosis.
- Never block urgent safety guidance behind a paywall.
- Offer Vet 24/7 when symptoms need professional assessment.
- Offer Premium softly after a useful answer and use a hard paywall only after
  the free allowance is exhausted.

## Own Vet 24/7

1. Start from the large home action or an AI escalation.
2. Reuse information already collected by AI.
3. Collect symptoms, duration and the active pet profile.
4. Show PLN 89.99 or the Premium price of PLN 49.99 before connecting.
5. Obtain consent to share the intake with the veterinarian.
6. Hand the structured brief to a PupilCare veterinarian.
7. Start the video consultation.
8. Save the summary and recommendations to the pet history.

## WetTermin integration

WetTermin is the first target for in-clinic veterinary booking. The intended
experience stays entirely inside PupilCare while a provider adapter retrieves
clinics, services, availability and booking status from the partner API.

Requested partner capabilities:

- clinic and doctor search
- services and available time slots
- create, confirm and cancel booking
- completed appointment status
- PupilCare referral attribution
- deep links, webhooks or white-label booking

## Account and data

- Supabase Auth supports e-mail, Google, Facebook and Apple.
- Supabase Postgres stores user-owned pet profiles and care history.
- Row Level Security restricts every record to its owner.
- OAuth provider secrets stay in Supabase and never enter the client bundle.
