const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';
const today = '2026-04-01';

async function test() {
  try {
    console.log('Testing GET /api/routes...');
    const res1 = await axios.get(`${BASE_URL}/routes?date=${today}`);
    console.log(`Status: ${res1.status}`);
    console.log(`Count: ${res1.data.length}`);
    if (res1.data.length > 0) {
      const route = res1.data[0];
      console.log(`Route: ${route.name}, Orders: ${route.Orders ? route.Orders.length : 0}`);
      if (route.Orders && route.Orders.length > 0) {
        console.log(`First Order Date: ${route.Orders[0].orderDate}`);
      }
    }

    console.log('\nTesting GET /api/routes with mealTime=Lunch...');
    const res2 = await axios.get(`${BASE_URL}/routes?date=${today}&mealTime=Lunch`);
    console.log(`Status: ${res2.status}`);
    if (res2.data.length > 0) {
       const route = res2.data[0];
       console.log(`Route: ${route.name}, Orders: ${route.Orders ? route.Orders.length : 0}`);
       if (route.Orders && route.Orders.length > 0) {
         console.log(`First Order MealTime: ${route.Orders[0].mealTime}`);
       }
    }

  } catch (error) {
    console.error('Error during testing:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

test();
