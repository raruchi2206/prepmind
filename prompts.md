# PrepMind Frontend Prompt Sequence

This file records the frontend-related prompts used during the PrepMind implementation, in chronological order.

## Prompt 1 - Premium PrepMind Frontend Redesign

Keep React + JSX + JavaScript. Do not convert the project to TypeScript. Do not rebuild the project from scratch. Do not remove existing functionality.

First inspect the entire existing frontend and understand the current component structure, routing, pages, reusable components, styling, and state management. Then refactor and improve the existing UI while preserving all working functionality.

Transform the app into a modern, premium, highly usable AI education product. Make light mode a first-class design with central tokens and accessible contrast. Keep navigation minimal and top-based, and hide it during quiz, practice, and viva assessments.

Improve the following areas while preserving the existing product flow:

- Dashboard
- Knowledge
- Create flow
- Summary and Notes
- Quiz, Practice Paper, and Viva assessment UIs
- History
- Progress
- Profile
- Responsive behavior
- Empty, loading, and error states

The product flow should feel like:

Knowledge -> Create -> Practice -> Evaluate -> Improve

Use the existing route architecture, components, state, and product concept. Do not add unrelated product scope. Run the project after implementation and check build errors, routes, light/dark mode, responsiveness, and the main user flows.

## Prompt 2 - Profile As A Navbar Account Popover

Completely change how Profile works in PrepMind. Do not create a separate Profile page or Profile URL. The user should not navigate to /profile.

Clicking the profile/avatar button in the top navbar should open a premium account popover or dropdown card directly below the avatar. It should be a compact modern SaaS account menu, not a full page or full-screen modal.

The popover should contain:

- User identity: avatar initials, name, email, and plan
- Account section with Profile and personal information
- Security section with Change password
- Preferences section with Appearance and Notifications
- Logout separated at the bottom

Use actual authenticated or existing mock user data. Do not use placeholder Aarav Sharma or aarav@example.com data. Use the existing warm PrepMind palette: dark brown, cream, warm beige, espresso, and black.

Profile should open a small edit modal instead of navigating. Change password should open a compact modal with current password, new password, and confirmation fields. Appearance should open a Light, Dark, and System selector and update the theme immediately. Notifications should use the existing notification interaction. Logout should return to Login.

The avatar should be an anchored account control with initials, optional first name, and a chevron. The popover must support click outside to close, Escape to close, and clicking the avatar again to toggle. It should be responsive on desktop, tablet, and mobile without becoming a full page.

Keep Dashboard, Knowledge, History, Progress, Theme, Notifications, and Create in the navbar. Only replace the old profile behavior. Redirect or remove any standalone profile route from the normal user flow.

## Prompt 3 - Restore Profile As A Real Profile Page

Change the PrepMind profile UX again. Create a completely separate Profile page at /profile. Do not use a profile dropdown card as the main profile experience. The navbar profile/avatar should navigate to /profile.

The profile page should feel like a real production application inspired only by the information hierarchy of the reference image. Do not copy its colors, typography, mobile UI, branding, or exact visual design.

Keep PrepMind's existing visual identity:

- Black
- Deep espresso
- Warm brown
- Cream
- Beige
- Premium AI aesthetic

The page should combine:

- Personal profile
- Preparation overview
- Account settings

The structure should be:

PROFILE HEADER
-> QUICK PREPARATION METRICS
-> YOUR PREPARATION
-> RECENT FOCUS
-> ACCOUNT
-> PREFERENCES
-> LOG OUT

Profile header requirements:

- Account label, Profile heading, and supporting description
- 64-80px warm avatar
- Ruchi Navinchandra
- ruchi@email.com
- Free Plan
- Edit Profile action
- Small back link to Dashboard

Quick metrics should use meaningful existing PrepMind data, with no more than four metrics. Use values such as Sources, Topics, and Average Score. Metrics should be elegant information blocks, not giant dashboard cards.

Your Preparation should use compact horizontal rows for knowledge sources, recent assessments or quizzes, focus topics, and viva sessions. Recent Focus should show a maximum of three existing progress topics with subtle progress bars.

Account settings should include:

- Profile information: update name and email
- Change password: current, new, and confirmation fields

Preferences should include:

- Appearance with Light, Dark, and System options using the existing theme system
- Notifications with the existing notification interaction
- Language set to English

Edit Profile and Change Password should open clean compact modals without navigating away. Logout should be visually separated at the bottom and return to Login.

Use a centered 1100-1200px desktop container and a balanced two-column layout. Collapse to one column on tablet and mobile. On mobile, order the content as Profile, Metrics, Preparation, Recent Focus, Account, Preferences, and Logout. Avoid card nesting, giant charts, admin-panel patterns, excessive uppercase labels, and unrelated statistics.

Keep the existing navbar destinations and make the avatar clearly navigate to /profile. Remove the old profile dropdown. Verify /profile in dark desktop, light desktop, tablet, and mobile modes, including the edit profile modal, password modal, appearance switch, notifications, logout, and navbar navigation.

## Prompt 4 - Save Frontend Prompts

Store all prompts used for frontend creation in prompts.md. Create the file if it does not exist and list the prompts in sequence order.
