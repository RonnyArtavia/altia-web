import { chromium } from 'playwright';

async function testMicrophoneFunctionality() {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-running-insecure-content',
      '--disable-web-security',
      '--auto-select-desktop-capture-source=Screen 1'
    ]
  });

  const context = await browser.newContext({
    permissions: ['microphone', 'camera']
  });

  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => {
    console.log(`CONSOLE [${msg.type()}]:`, msg.text());
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.error('PAGE ERROR:', error.message);
  });

  // Listen for network failures
  page.on('requestfailed', request => {
    console.error('NETWORK FAILURE:', request.url(), request.failure()?.errorText);
  });

  try {
    console.log('🔍 Testing microphone functionality on medical notes app...\n');

    // Navigate to the main page
    console.log('1. Navigating to http://localhost:5174/');
    await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000); // Wait for JS to load
    await page.screenshot({ path: 'homepage.png' });
    console.log('   ✅ Homepage loaded successfully');

    // Check if we need to authenticate
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Try to navigate to consultation page
    console.log('\n2. Attempting to navigate to consultation page...');
    await page.goto('http://localhost:5174/doctor/consultation', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000); // Wait for JS to load
    await page.screenshot({ path: 'consultation-page.png' });

    const consultationUrl = page.url();
    console.log(`   Current URL after navigation: ${consultationUrl}`);

    // Look for microphone-related elements
    console.log('\n3. Searching for microphone controls...');

    // Common selectors for microphone buttons
    const microphoneSelectors = [
      '[data-testid*="microphone"]',
      '[aria-label*="microphone"]',
      '[aria-label*="micrófono"]',
      'button[title*="microphone"]',
      'button[title*="micrófono"]',
      '.mic-button',
      '.microphone-button',
      '.voice-record',
      'button:has-text("Micrófono")',
      'button:has-text("Mic")',
      '[class*="mic"]',
      '[id*="mic"]'
    ];

    let microphoneButton = null;
    for (const selector of microphoneSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          microphoneButton = element;
          console.log(`   ✅ Found microphone button with selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Continue searching
      }
    }

    if (!microphoneButton) {
      console.log('   ❌ No microphone button found with common selectors');
      console.log('   🔍 Looking for all buttons on the page...');

      const allButtons = await page.locator('button').all();
      console.log(`   Found ${allButtons.length} buttons on the page`);

      for (let i = 0; i < allButtons.length; i++) {
        const button = allButtons[i];
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        const className = await button.getAttribute('class');

        console.log(`   Button ${i + 1}: text="${text}", aria-label="${ariaLabel}", title="${title}", class="${className}"`);

        if (text?.toLowerCase().includes('mic') ||
            ariaLabel?.toLowerCase().includes('mic') ||
            title?.toLowerCase().includes('mic') ||
            className?.toLowerCase().includes('mic')) {
          microphoneButton = button;
          console.log(`   ✅ Found potential microphone button: Button ${i + 1}`);
          break;
        }
      }
    }

    // Test MediaRecorder and getUserMedia APIs
    console.log('\n4. Testing browser media API support...');

    const mediaApiTest = await page.evaluate(async () => {
      const results = {
        navigator: !!navigator,
        mediaDevices: !!navigator?.mediaDevices,
        getUserMedia: !!navigator?.mediaDevices?.getUserMedia,
        MediaRecorder: typeof MediaRecorder !== 'undefined',
        webkitSpeechRecognition: typeof webkitSpeechRecognition !== 'undefined',
        SpeechRecognition: typeof SpeechRecognition !== 'undefined'
      };

      // Test microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        results.microphoneAccess = true;
        results.audioTracks = stream.getAudioTracks().length;
        stream.getTracks().forEach(track => track.stop()); // Clean up
      } catch (error) {
        results.microphoneAccess = false;
        results.microphoneError = error.message;
      }

      return results;
    });

    console.log('   Media API Support:');
    console.log(`   - Navigator: ${mediaApiTest.navigator}`);
    console.log(`   - MediaDevices: ${mediaApiTest.mediaDevices}`);
    console.log(`   - getUserMedia: ${mediaApiTest.getUserMedia}`);
    console.log(`   - MediaRecorder: ${mediaApiTest.MediaRecorder}`);
    console.log(`   - webkitSpeechRecognition: ${mediaApiTest.webkitSpeechRecognition}`);
    console.log(`   - SpeechRecognition: ${mediaApiTest.SpeechRecognition}`);
    console.log(`   - Microphone Access: ${mediaApiTest.microphoneAccess}`);
    if (mediaApiTest.microphoneAccess) {
      console.log(`   - Audio Tracks: ${mediaApiTest.audioTracks}`);
    } else {
      console.log(`   - Microphone Error: ${mediaApiTest.microphoneError}`);
    }

    // Test clicking the microphone button if found
    if (microphoneButton) {
      console.log('\n5. Testing microphone button interaction...');

      // Wait a moment and take screenshot before clicking
      await page.screenshot({ path: 'before-mic-click.png' });

      const isEnabled = await microphoneButton.isEnabled();
      const isVisible = await microphoneButton.isVisible();

      console.log(`   Button enabled: ${isEnabled}`);
      console.log(`   Button visible: ${isVisible}`);

      if (isEnabled && isVisible) {
        console.log('   Clicking microphone button...');
        await microphoneButton.click();

        // Wait for any state changes
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'after-mic-click.png' });

        // Check for any permission dialogs or error messages
        const errorMessages = await page.locator('[role="alert"], .error, .alert-danger, [class*="error"]').all();
        if (errorMessages.length > 0) {
          console.log('   ⚠️ Error messages found:');
          for (const error of errorMessages) {
            const text = await error.textContent();
            console.log(`     - ${text}`);
          }
        }

        // Check for loading states or recording indicators
        const recordingIndicators = await page.locator('[class*="recording"], [class*="pulse"], [aria-label*="recording"]').all();
        if (recordingIndicators.length > 0) {
          console.log('   🔴 Recording indicators found:');
          for (const indicator of recordingIndicators) {
            const text = await indicator.textContent();
            const className = await indicator.getAttribute('class');
            console.log(`     - text: "${text}", class: "${className}"`);
          }
        }
      } else {
        console.log('   ❌ Button is not enabled or visible');
      }
    }

    // Check for VoiceRecordingService errors in console
    console.log('\n6. Checking for VoiceRecordingService specific errors...');

    // Execute JavaScript to check for service instances
    const serviceCheck = await page.evaluate(() => {
      // Look for any global voice recording service instances
      const globals = Object.keys(window);
      const voiceRelated = globals.filter(key =>
        key.toLowerCase().includes('voice') ||
        key.toLowerCase().includes('record') ||
        key.toLowerCase().includes('speech')
      );

      return {
        voiceRelatedGlobals: voiceRelated,
        hasReact: typeof window.React !== 'undefined',
        hasVue: typeof window.Vue !== 'undefined',
        userAgent: navigator.userAgent
      };
    });

    console.log('   Voice-related globals:', serviceCheck.voiceRelatedGlobals);
    console.log('   Has React:', serviceCheck.hasReact);
    console.log('   Has Vue:', serviceCheck.hasVue);
    console.log('   User Agent:', serviceCheck.userAgent);

    // Take final screenshot
    await page.screenshot({ path: 'final-state.png' });

    console.log('\n🏁 Microphone test completed!');
    console.log('\nScreenshots saved:');
    console.log('- homepage.png');
    console.log('- consultation-page.png');
    console.log('- before-mic-click.png (if button found)');
    console.log('- after-mic-click.png (if button found)');
    console.log('- final-state.png');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'error-state.png' });
  } finally {
    await browser.close();
  }
}

// Run the test
testMicrophoneFunctionality().catch(console.error);