# Final Smoke Test Checklist

Use this after every production deployment.

## Public pages

- Homepage loads.
- About page loads.
- Pricing page loads.
- Contact page loads.
- News page loads.
- Jobs page loads.
- Events page loads.
- Training page loads.
- Support page loads.
- Legal pages load.
- `/sitemap.xml` loads.
- `/robots.txt` loads.

## Authentication

- Register a test account.
- Confirm email if Supabase email confirmation is enabled.
- Log in.
- Log out.
- Password reset flow opens the correct production URL.

## Onboarding and profile

- Complete onboarding.
- Edit profile.
- View public profile.
- View company page if company data exists.

## Member features

- Create a feed post.
- Like a post.
- Comment on a post.
- Join a group.
- Add a group post.
- Create a job.
- Create an event.
- Create an article.
- Ask a support question.
- Send a test message.
- Check notifications.

## Admin

- Admin dashboard loads.
- Production readiness page loads.
- Deployment guide page loads.
- User management loads.
- Reports page loads.
- Verification page loads.
- Adverts page loads.
- Analytics page loads.

## Payments

- Pricing page shows plans.
- Stripe checkout opens for each paid plan that has a Price ID.
- Stripe billing portal opens for an account with a Stripe customer.
- Stripe webhook receives test events.
- Subscription status updates in the app.

## Mobile and accessibility

- Test desktop width.
- Test mobile width.
- Check keyboard tab focus.
- Check forms have visible labels.
- Check buttons are readable and not overlapping.

## Logs

- Check browser console for errors.
- Check Vercel deployment logs.
- Check Supabase logs for failed requests.
- Check Stripe webhook delivery logs.
