import { chromium } from 'playwright';

const URL = 'https://wine-ai-mu.vercel.app';

async function testRegistration() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('1. Navigating to', URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('   Current URL:', page.url());
  console.log('   Page title:', await page.title());

  // Wait for the page to load
  await page.waitForTimeout(3000);
  
  // Check what's on the page
  const bodyText = await page.textContent('body');
  console.log('   Body text (first 200 chars):', bodyText?.substring(0, 200));

  // Look for register tab
  console.log('\n2. Looking for Register tab...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent();
    console.log('   Found button:', text?.trim());
  }

  // Click the register tab (הרשמה)
  const registerTab = await page.$('button:has-text("הרשמה")');
  if (registerTab) {
    console.log('\n3. Clicking Register tab...');
    await registerTab.click();
    await page.waitForTimeout(500);
  } else {
    console.log('   Register tab not found, trying English...');
    const regTabEn = await page.$('button:has-text("Register")');
    if (regTabEn) {
      await regTabEn.click();
      await page.waitForTimeout(500);
    }
  }

  // Fill in the form
  console.log('\n4. Filling registration form...');
  
  // Display name
  const displayNameInput = await page.$('#displayName');
  if (displayNameInput) {
    await displayNameInput.fill('Test User');
    console.log('   Filled display name');
  } else {
    console.log('   Display name field not found');
  }

  // Email
  const emailInput = await page.$('#email');
  if (emailInput) {
    await emailInput.fill('testuser123@test.com');
    console.log('   Filled email');
  }

  // Password
  const passwordInput = await page.$('#password');
  if (passwordInput) {
    await passwordInput.fill('Test1234!');
    console.log('   Filled password');
  }

  // Submit
  console.log('\n5. Clicking submit...');
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    console.log('   Clicked submit');
  }

  // Wait and check
  console.log('\n6. Waiting for navigation...');
  await page.waitForTimeout(5000);
  console.log('   Current URL:', page.url());
  
  const bodyAfter = await page.textContent('body');
  console.log('   Body text (first 300 chars):', bodyAfter?.substring(0, 300));

  // Check for errors
  const errorDiv = await page.$('.bg-red-50');
  if (errorDiv) {
    const errorText = await errorDiv.textContent();
    console.log('   ERROR SHOWN:', errorText);
  }

  // Wait more if still loading
  if (page.url() === URL + '/') {
    console.log('\n7. Waiting more...');
    await page.waitForTimeout(5000);
    console.log('   Current URL:', page.url());
    const bodyFinal = await page.textContent('body');
    console.log('   Body text (first 300 chars):', bodyFinal?.substring(0, 300));
  }

  // Check if we landed on onboarding
  if (page.url().includes('/onboarding')) {
    console.log('\n✅ SUCCESS! Navigated to onboarding page without refresh!');
  } else if (page.url() === URL + '/' || page.url() === URL) {
    // Check if home page or still auth
    const isAuth = await page.$('[data-app="signin-screen"]');
    if (isAuth) {
      console.log('\n❌ STILL ON AUTH PAGE - bug not fixed');
    } else {
      console.log('\n✅ SUCCESS! On home page');
    }
  }

  // Check for any console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('   Console error:', msg.text());
    }
  });

  await browser.close();
}

testRegistration().catch(console.error);
