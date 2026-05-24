# Travel Xchange Access And User Journey Report

Last reviewed: 21 May 2026

## Executive Summary

Travel Xchange currently has the right role list in the product, but most member features are still open to any logged-in member during MVP testing.

That means a Registered User, Verified Travel Professional, Supplier, Recruiter, Trainer, and Advertiser can currently use most of the same member tools once logged in.

Admin areas are restricted. Moderator, Admin, and Super Admin are treated as admin-level roles at the moment.

Public sign-up is paused on the live site. Public visitors can join the launch list, but they cannot create active accounts unless public auth is turned back on.

## Current User Types

| User type | Current system role | Current status |
| --- | --- | --- |
| Guest | No account | Can view public launch page and submit launch interest. |
| Launch signup | Not an account yet | Stored in the launch signup table for admin follow-up. |
| Registered User | `registered_user` | Basic logged-in member. |
| Verified Travel Professional | `verified_travel_professional` | Agent/homeworker/advisor style member. |
| Supplier | `supplier` | Supplier/company representative. |
| Recruiter | `recruiter` | Recruitment/employer user. |
| Trainer | `trainer` | Training provider or educator. |
| Advertiser | `advertiser` | Advertising partner. |
| Moderator | `moderator` | Admin-level access in current MVP. |
| Admin | `admin` | Admin-level access. |
| Super Admin | `super_admin` | Admin-level access; not yet separated from Admin. |

Business owners are not a separate role yet. They are currently represented by a user profile connected to a company profile.

Students/new entrants exist as launch signup interests, but they are not yet a logged-in platform role.

## Public Journey

| Section | Guest can do now | Notes |
| --- | --- | --- |
| Launch page `/` | View coming soon page and submit launch interest. | This is the main live public experience. |
| Launch signup form | Submit name, email, company, role interest, and message. | Does not create an active account. |
| Login `/login` | Page exists, but copy says owner/admin only. | Hidden from public navigation. |
| Register `/register` | Public registration is paused. | Controlled by `NEXT_PUBLIC_PUBLIC_AUTH_ENABLED`. |
| Onboarding `/onboarding` | Paused when public auth is off. | Existing admins can still log in directly. |
| Legal pages | Public pages exist. | Useful for production trust and compliance. |

## Logged-In Member Sections

Current rule: unless noted otherwise, these sections require a logged-in account but do not yet strongly separate access by member role.

| Section | Current access | What users can do now |
| --- | --- | --- |
| Home / dashboard | Any logged-in user | View profile summary, feed, right sidebar, ads, suggested people, and create posts. |
| Feed posts | Any logged-in user | Create posts, like posts, comment on posts, and filter by topic. |
| Search | Any logged-in user | Search people, companies, suppliers, posts, groups, jobs, events, news, training, and support content. |
| Profiles | Any logged-in user | View member profiles. Users can edit their own profile. |
| Company / Supplier pages | Any logged-in user | View company pages and follow companies. Users with a linked company can represent that company. |
| Groups | Any logged-in user | View groups, create groups, join/leave groups, and post in joined groups. |
| Jobs | Any logged-in user | View jobs, post jobs, bookmark jobs, and register interest. |
| Events | Any logged-in user | View events, create events, and register/cancel interest. |
| News | Any logged-in user | View news and supplier updates. Create article form currently exists for logged-in users. |
| Training | Any logged-in user | View courses, open lessons, enrol, and track lesson progress. |
| Support / Q&A | Any logged-in user | Ask questions, answer questions, vote/helpful, and mark best answer where allowed by the page logic. |
| Messages | Any logged-in user | Start conversations and send direct messages to other profiles. |
| Notifications | Any logged-in user | View personal notifications. |
| Billing / subscription | Any logged-in user | View billing/subscription screens and Stripe placeholders. |

## Admin Sections

Current admin roles: Moderator, Admin, and Super Admin.

These roles currently share admin-level access. We should split them later if we want Moderator to have less power than Admin.

| Section | Current access | What admins can do now |
| --- | --- | --- |
| Admin dashboard `/admin` | Moderator/Admin/Super Admin | View owner controls and admin navigation. |
| Launch signups | Moderator/Admin/Super Admin | View and manage pre-launch signup records. |
| Analytics | Moderator/Admin/Super Admin | View admin analytics and placeholder metrics. |
| Production readiness | Moderator/Admin/Super Admin | View production checklist. |
| Deployment | Moderator/Admin/Super Admin | View deployment guide/checklist. |
| Users | Moderator/Admin/Super Admin | View/manage users and profile roles where implemented. |
| Posts | Moderator/Admin/Super Admin | Review post-related admin/moderation views. |
| Reports | Moderator/Admin/Super Admin | Review moderation reports. |
| Verification | Moderator/Admin/Super Admin | Review verification requests. |
| Adverts | Admin role required by advert manager logic | Manage advertisers, campaigns, creatives, placements, impressions, and clicks. |
| Jobs admin | Moderator/Admin/Super Admin | Admin job oversight page. |
| Articles admin | Moderator/Admin/Super Admin | Admin article oversight page. |

## Current Role-by-Role Behaviour

| User type | What they can currently do | What should eventually be special |
| --- | --- | --- |
| Registered User | Use most member features. | Should probably have limited trust until verified. |
| Verified Travel Professional | Same as registered user, with better role label. | Should be the normal agent/member experience. |
| Supplier | Same as member, plus can have company/supplier profile. | Should manage supplier pages, supplier updates, training, events, and adverts for their company. |
| Recruiter | Same as member. | Should manage jobs and recruiter packages. |
| Trainer | Same as member. | Should manage training content and course modules. |
| Advertiser | Same as member. | Should manage their own ad campaigns, not all adverts. |
| Moderator | Admin-level at the moment. | Should moderate reports/content but not billing, deployment, or owner settings. |
| Admin | Admin-level. | Should manage users, content, verification, adverts, jobs, articles, and reports. |
| Super Admin | Same as Admin at the moment. | Should be the only role with full owner-level settings and destructive actions. |

## Recommended Access Tightening

These are not blockers for the current launch holding page, but they should be done before wider member launch.

| Priority | Recommendation | Why it matters |
| --- | --- | --- |
| High | Separate Moderator, Admin, and Super Admin permissions. | Prevents moderators accessing owner-level settings. |
| High | Limit article/news creation to Admin, Supplier, or approved content roles. | Stops normal members publishing official news. |
| High | Limit job posting to Recruiter, Supplier, Admin, or company owners. | Protects job board quality and revenue. |
| High | Limit ad manager access so Advertisers can manage only their campaigns. | Prevents advertisers seeing other advertisers. |
| Medium | Add company ownership checks for supplier/company pages. | Ensures only company owners manage company profiles. |
| Medium | Add verified-only posting options for sensitive areas. | Useful for trust and professional standards. |
| Medium | Add student/new entrant as a formal account role if needed. | Current system only has student as launch interest. |
| Medium | Add role-specific onboarding questions. | Lets the app tailor each user journey properly. |
| Low | Add read-only public previews for selected jobs, events, articles, and supplier pages. | Helpful later for SEO and acquisition. |

## User Journey Test Plan

Create one test account for each role. Use simple names such as:

| Test account | Role to set | Main journey to test |
| --- | --- | --- |
| `registered-test@...` | Registered User | Login, complete profile, create feed post, join group, ask support question. |
| `agent-test@...` | Verified Travel Professional | Edit profile, follow company, create post, comment, bookmark job, register for event. |
| `supplier-test@...` | Supplier | Create/edit company profile, supplier update, event, training interest, ad placeholder review. |
| `recruiter-test@...` | Recruiter | Post job, view job, check recruiter attribution, bookmark/interest flow from another account. |
| `trainer-test@...` | Trainer | View training, enrol, open lesson, test progress. |
| `advertiser-test@...` | Advertiser | Confirm current access, then later test advertiser-only campaign management. |
| `moderator-test@...` | Moderator | Confirm admin menu appears, test reports/moderation, note over-access areas. |
| `admin-test@...` | Admin | Test all admin pages. |
| `superadmin-test@...` | Super Admin | Test owner-level pages and final authority. |

## Section Test Checklist

For each test account:

1. Log in.
2. Confirm the left navigation shows the correct items.
3. Open Home.
4. Create a post.
5. Like and comment on a post.
6. Open Groups.
7. Join a group.
8. Post in a joined group.
9. Open Profile and edit profile details.
10. Open Jobs and try the expected job action for that role.
11. Open Events and register interest.
12. Open News and confirm whether creation is allowed or should be blocked.
13. Open Training and enrol in a course.
14. Open Support and ask/answer a question.
15. Open Messages and send a message to another test user.
16. Open Admin and confirm non-admin users are blocked.

## Plain-English Conclusion

The MVP is ready for internal testing, but access control is still broad for normal member roles.

The next important technical task should be a role permissions pass. That pass should decide exactly which roles can create jobs, articles, events, courses, adverts, company pages, and moderation actions.

