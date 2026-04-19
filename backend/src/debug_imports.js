const auth = require('./middleware/authMiddleware');
const ctrl = require('./controllers/configController');

console.log('Protect:', typeof auth.protect);
console.log('Authorize:', typeof auth.authorize);
console.log('GetConfigs:', typeof ctrl.getConfigs);
console.log('UpdateConfig:', typeof ctrl.updateConfig);
