import { chromium } from 'playwright';

async function simpleMicrophoneTest() {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-running-insecure-content',
      '--disable-web-security'
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

  try {
    console.log('🔍 Testing microphone functionality...\n');

    // Navigate to the main page
    console.log('1. Navigating to application...');
    await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000); // Wait for React to fully load

    console.log('✅ Application loaded');

    // Navigate to consultation page
    console.log('\n2. Navigating to consultation...');
    await page.goto('http://localhost:5174/doctor/consultation', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    console.log('✅ Consultation page loaded');

    // Test media APIs
    console.log('\n3. Testing browser media support...');
    const mediaSupport = await page.evaluate(async () => {
      const support = {
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
        support.microphonePermission = 'granted';
        support.audioTracks = stream.getAudioTracks().length;

        // Test MediaRecorder with the stream
        try {
          const recorder = new MediaRecorder(stream);
          support.mediaRecorderWorking = true;
        } catch (recorderError) {
          support.mediaRecorderWorking = false;
          support.mediaRecorderError = recorderError.message;
        }

        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        support.microphonePermission = 'denied';
        support.microphoneError = error.message;
      }

      return support;
    });

    console.log('Media API Support:');
    for (const [key, value] of Object.entries(mediaSupport)) {
      console.log(`   ${key}: ${value}`);
    }

    // Look for microphone buttons
    console.log('\n4. Searching for microphone controls...');

    const allButtons = await page.locator('button').all();
    console.log(`Found ${allButtons.length} buttons on the page`);

    let microphoneButton = null;
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      try {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        const className = await button.getAttribute('class');
        const id = await button.getAttribute('id');

        if ((text && (text.toLowerCase().includes('mic') || text.toLowerCase().includes('grabación'))) ||
            (ariaLabel && (ariaLabel.toLowerCase().includes('mic') || ariaLabel.toLowerCase().includes('grab'))) ||
            (title && (title.toLowerCase().includes('mic') || title.toLowerCase().includes('grab'))) ||
            (className && className.toLowerCase().includes('mic')) ||
            (id && id.toLowerCase().includes('mic'))) {

          console.log(`✅ Found microphone button ${i + 1}:`);
          console.log(`   text: "${text}"`);
          console.log(`   aria-label: "${ariaLabel}"`);
          console.log(`   title: "${title}"`);
          console.log(`   class: "${className}"`);
          console.log(`   id: "${id}"`);

          microphoneButton = button;
          break;
        }
      } catch (error) {
        // Skip this button
      }
    }

    if (microphoneButton) {
      console.log('\n5. Testing microphone button...');

      const isVisible = await microphoneButton.isVisible();
      const isEnabled = await microphoneButton.isEnabled();

      console.log(`Button visible: ${isVisible}`);
      console.log(`Button enabled: ${isEnabled}`);

      if (isVisible && isEnabled) {
        console.log('Clicking microphone button...');
        await microphoneButton.click();
        await page.waitForTimeout(3000);

        // Check for recording state
        const recordingState = await page.evaluate(() => {
          // Look for any global state or React dev tools
          if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ && window.__REACT_DEVTOOLS_GLOBAL_HOOK__.reactDevtoolsAgent) {
            return 'React DevTools detected';
          }
          return 'No obvious recording state detected';
        });

        console.log(`Recording state: ${recordingState}`);
      }
    } else {
      console.log('❌ No microphone button found');
      console.log('\nAll button texts found:');
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const button = allButtons[i];
        try {
          const text = await button.textContent();
          console.log(`   Button ${i + 1}: "${text}"`);
        } catch (error) {
          console.log(`   Button ${i + 1}: [Error getting text]`);
        }
      }
    }

    // Check for recording service errors
    console.log('\n6. Checking for VoiceRecordingService...');

    const serviceErrors = await page.evaluate(() => {
      // Check localStorage for any error states
      const localStorage = window.localStorage;
      const errors = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.toLowerCase().includes('voice') || key.toLowerCase().includes('record')) {
          errors.push(`${key}: ${localStorage.getItem(key)}`);
        }
      }

      return {
        localStorageErrors: errors,
        userAgent: navigator.userAgent,
        isSecureContext: window.isSecureContext,
        location: window.location.href
      };
    });

    console.log('Service check:');
    console.log(`   Secure context: ${serviceErrors.isSecureContext}`);
    console.log(`   Location: ${serviceErrors.location}`);
    console.log(`   LocalStorage voice/record items: ${serviceErrors.localStorageErrors.length}`);

    if (serviceErrors.localStorageErrors.length > 0) {
      serviceErrors.localStorageErrors.forEach(error => {
        console.log(`     ${error}`);
      });
    }

    console.log('\n🏁 Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
simpleMicrophoneTest().catch(console.error);