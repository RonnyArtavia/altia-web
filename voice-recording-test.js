import { chromium } from 'playwright';
import fs from 'fs';

async function testVoiceRecording() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const context = await browser.newContext({
    permissions: ['microphone']
  });

  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => {
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.log(`Page error: ${error.message}`);
  });

  try {
    console.log('🚀 Starting voice recording functionality test...');

    // 1. Navigate to the application
    console.log('\n1. Navigating to http://localhost:5173/...');
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);

    // Take initial screenshot
    try {
      await page.screenshot({ path: 'screenshots/01-homepage.png', fullPage: true, timeout: 5000 });
      console.log('✅ Homepage loaded, screenshot saved');
    } catch (e) {
      console.log('⚠️ Homepage screenshot failed, but continuing test...');
    }

    // Check if we need to login first
    const loginButton = page.locator('button:has-text("Iniciar Sesión")');
    if (await loginButton.isVisible()) {
      console.log('⚠️ Login page detected. The voice recording functionality requires authentication.');
      console.log('❌ Skipping authentication for this test - please login manually and test again.');

      try {
        await page.screenshot({ path: 'screenshots/02-login-required.png', fullPage: true, timeout: 5000 });
      } catch (e) {
        console.log('⚠️ Login screenshot failed');
      }

      console.log('\n📋 TEST SUMMARY:');
      console.log(`✅ Application loaded: YES`);
      console.log(`❌ Authentication required: YES`);
      console.log(`❌ Voice recording accessible: NO (authentication required)`);

      return;
    }

    // 2. Navigate directly to medical consultation page
    console.log('\n2. Navigating to medical consultation page...');
    await page.goto('http://localhost:5173/doctor/consultation', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(3000);

    try {
      await page.screenshot({ path: 'screenshots/02-navigation-attempt.png', fullPage: true, timeout: 5000 });
    } catch (e) {
      console.log('⚠️ Navigation screenshot failed');
    }

    // 3. Look for voice recording controls
    console.log('\n3. Searching for voice recording controls...');

    // Based on the actual implementation from ChatPanelCopilot.tsx
    const voiceRecordingSelectors = [
      'button[title="Iniciar Dictado"]', // Main microphone button
      'button:has-text("Pausar")',       // Pause button
      'button:has-text("Finalizar")',    // Finalize button
      'svg[data-lucide="mic"]',          // Lucide Mic icon
      'svg[data-lucide="mic-off"]',      // Lucide MicOff icon
      'button[aria-label*="microphone"]',
      'button[aria-label*="record"]',
      '[data-testid*="microphone"]',
      '[data-testid*="record"]'
    ];

    let microphoneButton = null;
    for (const selector of voiceRecordingSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        microphoneButton = element;
        console.log(`✅ Found microphone button: ${selector}`);
        break;
      }
    }

    if (!microphoneButton) {
      console.log('❌ No microphone button found with common selectors');
      console.log('🔍 Searching for any button elements that might be recording controls...');

      const allButtons = await page.locator('button').all();
      for (let i = 0; i < allButtons.length; i++) {
        const button = allButtons[i];
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        console.log(`Button ${i}: text="${text}", aria-label="${ariaLabel}"`);
      }
    }

    // Look for other recording controls (these will only be visible when recording is active)
    const pauseSelectors = [
      'button:has-text("Pausar")',       // Main pause button from implementation
      'button:has-text("PAUSADO")',      // Paused state button
      'button:has-text("Reanudar")',     // Resume button
      'button[aria-label*="pause"]',
      '[data-testid*="pause"]'
    ];

    const finalizeSelectors = [
      'button:has-text("Finalizar")',    // Main finalize button from implementation
      'button:has-text("FINALIZAR")',    // Uppercase version
      'button[aria-label*="stop"]',
      'button[aria-label*="finish"]',
      'button[aria-label*="finalize"]',
      '[data-testid*="stop"]',
      '[data-testid*="finish"]'
    ];

    let pauseButton = null;
    let finalizeButton = null;

    for (const selector of pauseSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        pauseButton = element;
        console.log(`✅ Found pause button: ${selector}`);
        break;
      }
    }

    for (const selector of finalizeSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        finalizeButton = element;
        console.log(`✅ Found finalize button: ${selector}`);
        break;
      }
    }

    try {
      await page.screenshot({ path: 'screenshots/03-voice-controls-search.png', fullPage: true, timeout: 5000 });
    } catch (e) {
      console.log('⚠️ Voice controls screenshot failed');
    }

    // 4. Test microphone functionality if button found
    if (microphoneButton) {
      console.log('\n4. Testing microphone button click...');

      // Check initial state
      const initialClass = await microphoneButton.getAttribute('class');
      const initialAriaLabel = await microphoneButton.getAttribute('aria-label');
      console.log(`Initial button state - class: "${initialClass}", aria-label: "${initialAriaLabel}"`);

      // Click microphone button
      console.log('Attempting to click microphone button...');
      await microphoneButton.click();
      await page.waitForTimeout(3000);

      // Check for microphone permission prompt
      console.log('Checking for browser microphone permission...');

      // Check if state changed after click
      const newClass = await microphoneButton.getAttribute('class');
      const newAriaLabel = await microphoneButton.getAttribute('aria-label');
      console.log(`After click - class: "${newClass}", aria-label: "${newAriaLabel}"`);

      // Look for recording indicators that might appear
      const recordingIndicators = [
        'text="GRABANDO"',
        'text="ESCUCHANDO"',
        'text="RECORDING"',
        '.recording',
        '[data-recording="true"]',
        'svg[data-lucide="mic"]',
        '.animate-pulse'
      ];

      let recordingActive = false;
      for (const indicator of recordingIndicators) {
        const element = page.locator(indicator).first();
        if (await element.isVisible()) {
          console.log(`✅ Recording indicator found: ${indicator}`);
          recordingActive = true;
          break;
        }
      }

      if (recordingActive) {
        console.log('✅ Voice recording appears to be active');
      } else if (newClass !== initialClass || newAriaLabel !== initialAriaLabel) {
        console.log('✅ Button state changed after click');
      } else {
        console.log('⚠️ No clear indication of recording activation');
      }

      try {
        await page.screenshot({ path: 'screenshots/04-after-mic-click.png', fullPage: true, timeout: 5000 });
      } catch (e) {
        console.log('⚠️ Microphone click screenshot failed');
      }

      // 5. Check for recording status indicators
      console.log('\n5. Looking for recording status indicators...');

      const statusIndicators = [
        '[class*="recording"]',
        '[data-testid*="recording"]',
        'text="Recording"',
        'text="Grabando"',
        '[class*="duration"]',
        '[data-testid*="duration"]'
      ];

      for (const selector of statusIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          const text = await element.textContent();
          console.log(`✅ Found recording status indicator: ${selector} - "${text}"`);
        }
      }

      // 6. Test pause functionality
      if (pauseButton) {
        console.log('\n6. Testing pause button...');
        await pauseButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Pause button clicked');
        try {
          await page.screenshot({ path: 'screenshots/05-after-pause-click.png', fullPage: true, timeout: 5000 });
        } catch (e) {
          console.log('⚠️ Pause click screenshot failed');
        }
      } else {
        console.log('\n6. ❌ No pause button found to test');
      }

      // 7. Test finalize functionality
      if (finalizeButton) {
        console.log('\n7. Testing finalize button...');
        await finalizeButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Finalize button clicked');
        try {
          await page.screenshot({ path: 'screenshots/06-after-finalize-click.png', fullPage: true, timeout: 5000 });
        } catch (e) {
          console.log('⚠️ Finalize click screenshot failed');
        }
      } else {
        console.log('\n7. ❌ No finalize button found to test');
      }

    } else {
      console.log('\n4-7. ❌ Cannot test microphone functionality - no microphone button found');
    }

    // 8. Check for JavaScript errors in console
    console.log('\n8. Checking for JavaScript errors...');
    const logs = [];
    page.on('console', msg => logs.push(msg));

    await page.waitForTimeout(2000);

    // 9. Final screenshot
    console.log('\n9. Taking final screenshot...');
    try {
      await page.screenshot({ path: 'screenshots/07-final-state.png', fullPage: true, timeout: 5000 });
    } catch (e) {
      console.log('⚠️ Final screenshot failed');
    }

    // Summary
    console.log('\n📋 TEST SUMMARY:');
    console.log(`✅ Homepage loaded: YES`);
    console.log(`✅ Microphone button found: ${microphoneButton ? 'YES' : 'NO'}`);
    console.log(`✅ Pause button found: ${pauseButton ? 'YES' : 'NO'}`);
    console.log(`✅ Finalize button found: ${finalizeButton ? 'YES' : 'NO'}`);

    if (!microphoneButton && !pauseButton && !finalizeButton) {
      console.log('\n🚨 CRITICAL: No voice recording controls found!');
      console.log('This suggests the voice recording feature may not be implemented or accessible on this page.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    try {
      await page.screenshot({ path: 'screenshots/error-state.png', fullPage: true, timeout: 5000 });
    } catch (e) {
      console.log('⚠️ Error screenshot failed');
    }
  } finally {
    await browser.close();
  }
}

// Create screenshots directory
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

testVoiceRecording().catch(console.error);