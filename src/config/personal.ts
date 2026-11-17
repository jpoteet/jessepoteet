/** Personal identity and off-the-clock copy. Facts only. */

export const identityRoles = [
  'Jesus Follower',
  'Business Coach',
  'Podcaster',
  'Content Creator',
  'Home Chef',
  'Fly Fisherman',
  'Screen Printer',
  'Woodworker',
  'Modular Synth Beginner',
] as const;

export const offTheClock = {
  eyebrow: 'Off the clock',
  heading: 'When I am not in a spreadsheet or on a press',
  lead:
    'I am usually somewhere between a river, a kitchen, a workbench, or a quiet morning with a Bible open. The goal is the same at work and at home: show up, make something real, leave a little margin for the people I love.',
  lines: [
    {
      title: 'Fly fishing',
      body: 'Clear water, bad casts, and the occasional fish that actually cooperates. Peak happiness is wet boots and no Slack notifications.',
    },
    {
      title: 'Camping and family',
      body: 'Weekends outside with Kristie, Bristol, and Callan beat almost any calendar invite. Tent stakes optional. Snacks required.',
    },
    {
      title: 'Home chef',
      body: 'I cook like it is a competitive sport nobody asked me to enter. The kitchen is my other workshop.',
    },
    {
      title: 'Woodworking and modular synths',
      body: 'Sawdust one night, patch cables the next. Both reward patience. Both sound cooler than email.',
    },
  ],
} as const;
