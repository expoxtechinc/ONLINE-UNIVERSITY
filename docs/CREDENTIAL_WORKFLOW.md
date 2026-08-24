# Automated credential workflow

Online University issues a certificate only after the learner has an **active enrollment**, completed every required course lesson, and passed the configured final assessment. The platform records the completion event, issues one immutable verification code per learner-course pair, and exposes a minimal public verification result. Administrators can revoke a credential but cannot alter its verification history in place.

| Step | Server-side rule | Learner outcome |
|---|---|---|
| Credential profile | Learner supplies a legal certificate name and optional country. The name is retained as the certificate display name. | The learner can confirm how their name appears on credentials. |
| Lesson completion | Authenticated learner completes a lesson that belongs to their active enrollment. The server records completion once. | Course progress is recalculated from the course curriculum. |
| Final assessment | The server evaluates the submitted answers against the protected assessment configuration and pass score. | A score and pass/fail result are stored. |
| Credential issue | The server confirms complete progress and a passing final result, then creates a unique verification code. | The verified certificate appears automatically in the learner record. |
| Downloads | Authenticated learner requests a printable certificate or transcript document. The server generates the document from current secure records. | The learner can download their credential and transcript without exposing another learner’s data. |
| Public verification | A QR code points to the public verification URL. The route returns only credential validity, learner name, course, score, and issue date. | Employers and institutions can verify the certificate ID without account access. |

The certificate document uses the organization’s original navy-and-gold visual system and authorized registrar signature treatment. It does not claim external accreditation, partnership, blockchain verification, or association with any third-party organization.
