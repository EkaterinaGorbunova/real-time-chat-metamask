// @ts-check
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

// Tests that exercise the real chat UI require a working Ably client. When the
// ABLY_API_KEY is not configured (e.g. on a fork without secrets) the app
// renders an AblyConfigError instead of the chat, so the message input never
// appears. Detect the key from either the process env or a local .env file
// (Next.js loads .env.local at build/dev time but Playwright does not), and
// skip the chat-dependent tests when it is missing rather than failing CI.
const hasAblyKeyInEnv = Boolean(process.env.ABLY_API_KEY);
const hasAblyKeyInDotenv = ['.env.local', '.env'].some((file) => {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    return /^\s*ABLY_API_KEY\s*=\s*\S/m.test(content);
  } catch (_) {
    return false;
  }
});
const ABLY_CONFIGURED = hasAblyKeyInEnv || hasAblyKeyInDotenv;
const describeChat = ABLY_CONFIGURED ? test.describe : test.describe.skip;

test.describe('Real-time Chat - Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle('Chat');
  });

  test('shows Web3 Chat header with logo', async ({ page }) => {
    await expect(page.getByText('Web3 Chat')).toBeVisible();
  });

  test('shows Connect Wallet button when wallet is not connected', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /Connect Wallet/i });
    await expect(connectButton).toBeVisible();
  });

  test('shows WalletIsNotConnected prompt when wallet is not connected', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Connect Your Wallet' })
    ).toBeVisible();
    await expect(
      page.getByText(/Connect any Web3 wallet/i)
    ).toBeVisible();
  });

  test('does not show chat interface when wallet is not connected', async ({ page }) => {
    await expect(
      page.getByPlaceholder('Type your message...')
    ).toHaveCount(0);
  });

  test('shows alert when clicking Connect Wallet without a Web3 wallet installed', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.getByRole('button', { name: /Connect Wallet/i }).click();
    await page.waitForTimeout(500);

    expect(alertMessage).toContain('No Web3 wallet detected');
  });

  test('logout button is not visible when wallet is not connected', async ({ page }) => {
    const logoutButton = page.getByRole('button', { name: 'Logout' });
    await expect(logoutButton).toHaveCount(0);
  });
});

describeChat('Real-time Chat - Connected wallet (mocked MetaMask)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject a minimal EIP-1193 provider mock before the app loads
    await page.addInitScript(() => {
      const testAddress = '0x1234567890abcdef1234567890abcdef12345678';
      window.ethereum = {
        isMetaMask: true,
        selectedAddress: null,
        chainId: '0x1',
        request: async ({ method }) => {
          if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
            window.ethereum.selectedAddress = testAddress;
            return [testAddress];
          }
          if (method === 'eth_chainId') return '0x1';
          if (method === 'net_version') return '1';
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/');
  });

  test('shows chat interface after clicking Connect Wallet', async ({ page }) => {
    await page.getByRole('button', { name: /Connect Wallet/i }).click();

    await expect(
      page.getByRole('heading', { name: 'Connect Your Wallet' })
    ).toBeHidden();

    await expect(
      page.getByPlaceholder('Type your message...')
    ).toBeVisible({ timeout: 15000 });
  });

  test('shows Logout button after connecting wallet', async ({ page }) => {
    await page.getByRole('button', { name: /Connect Wallet/i }).click();

    await expect(
      page.getByRole('button', { name: 'Logout' })
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Real-time Chat - Guest mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows Continue as Guest card with prefilled nickname', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Continue as Guest' })
    ).toBeVisible();

    const nicknameInput = page.getByLabel('Guest nickname');
    await expect(nicknameInput).toBeVisible();
    await expect(nicknameInput).toHaveValue(/^Guest-[a-z0-9]{6}$/);
  });

  test('Join as Guest button is disabled when nickname is empty', async ({ page }) => {
    const nicknameInput = page.getByLabel('Guest nickname');
    await nicknameInput.fill('');
    await expect(
      page.getByRole('button', { name: 'Join as Guest' })
    ).toBeDisabled();
  });

  (ABLY_CONFIGURED ? test : test.skip)(
    'entering chat as guest shows chat interface and guest icon',
    async ({ page }) => {
      const nicknameInput = page.getByLabel('Guest nickname');
      await nicknameInput.fill('TestGuest');
      await page.getByRole('button', { name: 'Join as Guest' }).click();

      await expect(
        page.getByPlaceholder('Type your message...')
      ).toBeVisible({ timeout: 15000 });

      // Header should display the nickname (as a titled badge)
      await expect(page.getByTitle('TestGuest')).toBeVisible();
    }
  );

  (ABLY_CONFIGURED ? test : test.skip)(
    'guest session persists across page reload',
    async ({ page }) => {
      await page.getByLabel('Guest nickname').fill('PersistentGuest');
      await page.getByRole('button', { name: 'Join as Guest' }).click();
      await expect(
        page.getByPlaceholder('Type your message...')
      ).toBeVisible({ timeout: 15000 });

      await page.reload();

      await expect(
        page.getByPlaceholder('Type your message...')
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole('heading', { name: 'Continue as Guest' })
      ).toHaveCount(0);
    }
  );

  (ABLY_CONFIGURED ? test : test.skip)(
    'logout from guest returns to join screen and does not auto-reconnect',
    async ({ page }) => {
      await page.getByLabel('Guest nickname').fill('LogoutGuest');
      await page.getByRole('button', { name: 'Join as Guest' }).click();
      await expect(
        page.getByPlaceholder('Type your message...')
      ).toBeVisible({ timeout: 15000 });

      await page.getByRole('button', { name: 'Logout', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Continue as Guest' })
      ).toBeVisible();

      await page.reload();
      await expect(
        page.getByRole('heading', { name: 'Continue as Guest' })
      ).toBeVisible();
      await expect(
        page.getByPlaceholder('Type your message...')
      ).toHaveCount(0);
    }
  );
});
