# Software Project Architect - Widget Integration & Marketing Funnel Plan
*Standalone Widget, Intro Chat, and Marketing Funnel Implementation*

## Problem Statement

The Software Project Architect needs to integrate into a larger AWS-like suite of AI products. Additionally, user feedback indicates the current 28-question flow feels like an "interrogation" rather than an engaging conversation.

## Goals

1. **Integrate widget into parent application** with proper auth and styling consistency
2. **Create engaging intro flow** with 5 conversational questions to build rapport
3. **Separate marketing funnel** from technical architecture flow
4. **Maintain architect quality** while improving user engagement

## Architecture Decision: **Standalone Widget + Auth Token**

### Why Standalone Widget?
- **Independent scaling/deployment**
- **Separate databases** = cleaner data isolation
- **Independent versioning** and deployment cycles
- **Better resource allocation** and debugging
- **Flexible integration** into multiple parent apps

### Auth Integration Design
```typescript
// Parent app embeds widget via iframe
<iframe src="https://architect.yourapp.com?token=jwt_token&externalId=user_123" />

// Widget verifies token with parent app's auth endpoint
POST parentapp.com/auth/verify-token
Headers: { Authorization: "Bearer jwt_token" }
Response: { valid: true, userId: "123", externalId: "user_123", theme: {...} }
```

## Intro Chat Component (5 Questions)

### Purpose
- **Build rapport** and engagement with users
- **Establish conversation** rather than interrogation feel
- **Capture high-level context** for architect
- **Marketing funnel** conversion tool

### Question Design (Conversational Style)
0. **"What are you trying to create?"** (high-level description of what they want to achieve/build)
1. **"What kind of software are you building?"** (Web app, mobile app, desktop, API, etc.)
2. **"Who will use this software?"** (Internal team, customers, specific audience)  
3. **"What's the main problem it solves?"** (Business value/purpose)
4. **"How soon do you need it live?"** (Timeline pressure/scope)
5. **"What's your team size?"** (Solo, small team, large team)

### Psychological Engagement Techniques
- **Repeat back user answers** to show understanding
- **Generate project brief in background** while appearing to "think"
- **Transition smoothly** to architect with context
- **Avoid technical jargon** in intro phase
- **Build excitement** about their project vision

## Marketing Funnel User Flows

### Pre-Login Flow (Marketing Site):
```
Landing Page 
  ↓ "Get Started" CTA
Intro Chat (5 questions)
  ↓ After completion
"Sign up to continue architecting your [PROJECT_TYPE]" 
  ↓ Registration
Architect Widget (with intro context)
```

### Post-Login Flow (Dashboard):
```
Dashboard 
  ↓ "New Project" button
Choice: Skip Intro OR Start with Intro
  ↓ 
Architect Widget (with or without intro context)
```

### State Management
- **Intro results** stored temporarily in session/localStorage
- **Project brief** passed to architect as initial context
- **Seamless handoff** between intro and architect phases

## Architect Flow Updates

### Question Strategy (Updated)
- **Maintain 50/50 product/tech split** by default
- **More product focus** when "AI makes tech decisions" enabled
- **Avoid redundancy** with intro answers but **continue product deep-dive**
- **Product questions examples**: User flows, feature priorities, UI/UX preferences, business logic
- **Tech questions examples**: Framework choices, database design, deployment strategy

### Intro Context Integration
```typescript
// Architect receives intro brief
const introBrief = {
  whatTheyreDoing: "description",
  projectType: "mobile app",
  audience: "casual gamers", 
  problem: "quick entertainment",
  timeline: "2 months",
  teamSize: "solo developer"
};

// Architect uses context to:
// 1. Skip redundant questions
// 2. Focus remaining questions on architecture specifics
// 3. Make smarter defaults based on intro answers
```

## Styling Consistency Plan

### Recommended: CSS Variables + Theme API
```css
/* Parent app defines design system */
:root {
  --primary-color: #your-brand;
  --secondary-color: #accent;
  --border-radius: 8px;
  --font-family: 'Inter', sans-serif;
  --spacing-unit: 1rem;
}
```

### Widget Theme Integration
```typescript
// 1. Widget receives theme config from parent auth response
// 2. Applies CSS variables dynamically
// 3. Inherits parent app's visual identity seamlessly
```

## Implementation Phases

### Phase 1: Intro Chat Component
**Timeline: 1-2 days**
- Create standalone intro chat component
- Implement 5 conversational questions with engagement techniques
- Add project brief generation
- Test user engagement and conversion

### Phase 2: Widget Separation & Auth
**Timeline: 2-3 days**  
- Deploy architect as standalone widget app
- Implement auth token verification system
- Add theme inheritance from parent app
- Test iframe integration

### Phase 3: Marketing Funnel Integration
**Timeline: 1-2 days**
- Integrate intro chat into marketing site
- Add registration gate after intro completion
- Connect intro context to architect widget
- Test complete user journey

### Phase 4: Dashboard Integration
**Timeline: 1 day**
- Add widget to parent app dashboard
- Implement auth token passing
- Add "skip intro" option for returning users
- Test authenticated user flow

## Success Metrics

### User Experience
- **Reduced perceived complexity** (5 intro vs 28 technical questions upfront)
- **Higher engagement** through conversational intro
- **Improved conversion** from marketing site visitors
- **Seamless integration** feeling within parent app

### Technical
- **Independent scaling** of widget component
- **Clean auth integration** between apps
- **Consistent visual design** across suite
- **Maintainable codebase** with clear separation

### Business
- **Marketing funnel optimization** with intro → registration flow
- **Tool usage tracking** across parent app suite
- **User retention** through better onboarding experience

## Next Steps

1. **Validate intro questions** with target users
2. **Define theme variables** from parent app design system  
3. **Set up deployment infrastructure** for standalone widget
4. **Create auth token specification** between apps
5. **Plan intro chat prompt engineering** for maximum engagement

## Key Decisions Needed

1. **Subdomain strategy**: `architect.yourapp.com` or `yourapp.com/architect`?
2. **Intro chat storage**: Temporary session vs persist until registration?
3. **Skip intro option**: Always available or only for returning users?
4. **Theme override**: Allow widget customization or strict parent inheritance?

---

*This plan maintains the architect's technical depth while creating a more engaging, conversion-optimized user experience through strategic separation of concerns.*