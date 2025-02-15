import axios from 'axios'; // Use Axios for future API calls
import config from './config.js';

const functions = [
  // Function to retrieve plan prices of the product
  {
    name: 'getPlanPrices',
    description: 'Get available plans and pricing for Wassenger services.',
    parameters: { type: 'object', properties: {} },
    run: async () => {
      console.log('[info] Fetching plan prices...');
      return `*Send & Receive messages + API + Webhooks + Team Chat + Campaigns + CRM + Analytics*

- Platform Professional: 30,000 messages + unlimited inbound messages + 10 campaigns / month
- Platform Business: 60,000 messages + unlimited inbound messages + 20 campaigns / month
- Platform Enterprise: unlimited messages + 30 campaigns

Each plan is limited to one WhatsApp number. You can purchase multiple plans if you have multiple numbers.

*Find more details here:* https://wassenger.com/#pricing`;
    }
  },
  
  // Function to check user info (mocked for now)
  {
    name: 'loadUserInformation',
    description: 'Retrieve user name and email from CRM.',
    parameters: { type: 'object', properties: {} },
    run: async () => {
      console.log('[info] Trying to load user information...');
      return 'I am unable to access the CRM at the moment. Please try again later.';
    }
  },
  
  // Function to check meeting availability
  {
    name: 'verifyMeetingAvailability',
    description: 'Check if a given date and time is available for a meeting.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', format: 'date-time', description: 'Date of the meeting' }
      },
      required: ['date']
    },
    run: async ({ parameters }) => {
      console.log(`[info] Checking availability for ${parameters.date}...`);
      const date = new Date(parameters.date);
      if (date.getUTCDay() > 5) return 'Not available on weekends.';
      if (date.getHours() < 9 || date.getHours() > 17) return 'Not available outside business hours: 9 AM to 5 PM.';
      return 'Available';
    }
  },
  
  // Function to book a sales meeting
  {
    name: 'bookSalesMeeting',
    description: 'Book a sales/demo meeting on a specific date and time.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', format: 'date-time', description: 'Date of the meeting' }
      },
      required: ['date']
    },
    run: async ({ parameters }) => {
      console.log(`[info] Booking meeting for ${parameters.date}...`);
      return 'Meeting booked successfully. You will receive a confirmation email shortly.';
    }
  },
  
  // Function to get current date and time
  {
    name: 'currentDateAndTime',
    description: 'Retrieve the current date and time.',
    run: async () => {
      return new Date().toLocaleString();
    }
  }
];

export default functions;
