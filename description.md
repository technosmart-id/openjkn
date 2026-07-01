# OpenJKN — Business Flow Overview

How work moves through the system, page by page.

---

## 1. `/dashboard` — The daily operations cockpit

Every working day starts here. Before anyone touches a record, the dashboard tells the operations team the shape of the workload: how many citizens are covered, how many enrollment applications are sitting in the queue, how many are waiting on payment, and how many change requests need a decision. It frames the day's priorities — what is pending, what is at risk, and what needs a human's attention — so the team knows where to direct effort rather than hunting for work.

---

## 2. `/peserta` & `/peserta/baru` — Onboarding a citizen into the insured population

This is where a person first *becomes* a member of the national health insurance program. A prospective member is walked through capturing who they are — identity, household, address — then classified into the correct segment (the type of worker or beneficiary they are), assigned a treatment class, and linked to a healthcare facility, with their family enrolled alongside them. Once saved, they exist as part of the **insured population** the program is responsible for. `/peserta` is the living registry of that population — the people we serve — and the place staff return to whenever a member's identity or status must be confirmed.

---

## 3. `/pendaftaran` & `/pendaftaran/baru` — Activating coverage and starting the billing lifecycle

Being a person in the registry is not the same as being *covered*. This flow turns a registered person into an active, paying, insured member: an enrollment application is created, verified, a virtual account is generated, payment is collected, and only then does the membership go **Aktif**. It is the commercial onboarding path — the moment a person transitions from "known to the system" to "entitled to benefits" — and it carries each case through its financial checkpoints from draft to activation, rejection, or expiry.

---

## 4. `/perubahan` & `/perubahan/baru` — Keeping the master record truthful over a member's lifetime

People's lives change: they move, switch employers, get promoted, earn more, change doctors, retire, or pass away — and their family composition shifts too. Every one of these events is a formal change request that must be filed, verified, and approved before the master record is updated, so that premiums, benefits, and eligibility always reflect reality. This is the **continuous-data-integrity flow** that keeps the program's view of each member accurate over years, with the previous and new values captured for audit at each step.

---

## 5. `/faskes` — Managing the provider network members rely on

Coverage is only meaningful if there is somewhere to receive care. This is the **supply side** of the program — the directory of clinics, puskesmas, and hospitals that form the network members are assigned to and draw services from. Keeping this network current and correctly classified (by facility type and tier) is what makes it possible to route members to the right care and to know which providers are active partners in the system.

---

## 6. `/sync` — Bridging enrollment into the insurance back office (openIMIS)

OpenJKN is where members are *enrolled*; openIMIS is where the insurance is actually *administered* — policies, claims, and benefits. This flow is the bridge between the two: it pushes each member's data downstream into openIMIS so the back office can process what the front office has produced. It is where the enrollment work completed upstream becomes usable for claims handling, and where staff monitor whether every record has successfully crossed over or needs to be retried.

---

## 7. `/analitik/anomali` & `/analitik/dashboard` — Assuring data quality and surfacing risk at scale

Across a large membership, some records will inevitably be wrong or suspicious — a child listed as head of family, someone still active past 110, an impossible age, a household of fifteen. Rather than discover these by accident, this flow **trains the system to recognize what normal looks like and then scans the entire population** to flag the records that demand human review — combining machine-learning detection with explicit business rules. It is the program's quality-assurance and early-warning mechanism: keeping the data clean, exposing potential fraud or data-entry error, and, through the dashboard, giving decision-makers a visual read on the health of the dataset.

---

## 8. `/satusehat` — Reporting care into the national health record

The final link in the chain is what happens when a member actually *receives* care. When a member arrives at a facility, that visit is reported as an **encounter** to SatuSehat — the national health information exchange — connecting the member, the treating facility, and the practitioner so the care episode becomes part of the patient's record in the national ecosystem. It is where the program's internal work connects to the country's broader health-data infrastructure.

---

## 9. `/sync` *(duplicate of #6)*

This is the same openIMIS synchronization flow described in item 6. See above.
