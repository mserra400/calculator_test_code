// A simple Node.js + Express backend to handle chat messages and call payroll calculation

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Dummy function to simulate payroll calculation
function calculatePayroll({ province, employeeType, hoursWorked, hourlyRate }) {
  // You'd replace this with real logic or call your payroll API
  const grossPay = hoursWorked * hourlyRate;
  const deductions = grossPay * 0.25; // Fake 25% deduction for demo
  const netPay = grossPay - deductions;
  return { grossPay, deductions, netPay };
}

// Endpoint to handle AI function calling
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  const tools = [
    {
      type: 'function',
      function: {
        name: 'calculatePayroll',
        description: 'Calculate net payroll based on region and worker type',
        parameters: {
          type: 'object',
          properties: {
            province: { type: 'string' },
            employeeType: { type: 'string' },
            hoursWorked: { type: 'number' },
            hourlyRate: { type: 'number' }
          },
          required: ['province', 'employeeType', 'hoursWorked', 'hourlyRate']
        }
      }
    }
  ];

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages,
        tools,
        tool_choice: 'auto'
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const toolCall = response.data.choices[0].message.tool_calls?.[0];

    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = calculatePayroll(args);
      res.json({ type: 'function_result', content: result });
    } else {
      res.json({ type: 'text', content: response.data.choices[0].message.content });
    }
  } catch (error) {
    console.error(error.response?.data || error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
