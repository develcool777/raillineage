import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';
import { describe, expect, test, vi } from 'vitest';
import { renderInApp } from '@test/support/component.utils';
import PlayerSettings from '~/features/explorer/time/components/PlayerSettings.vue';
import { DEFAULT_PLAYER } from '~/features/explorer/time/time.constants';

/**
 * The settings, opened from their button, on a computer or a phone.
 *
 * @param phone - Whether on a phone.
 * @returns What it asks to change.
 */
const openSettings = async (phone = false) => {
  const user = userEvent.setup();
  const onSettings = vi.fn();
  await renderInApp(PlayerSettings, { settings: DEFAULT_PLAYER, phone, onSettings });
  await user.click(screen.getByRole('button', { name: 'Player settings' }));
  await screen.findByRole('group', { name: 'Player settings' });
  return { user, onSettings };
};

describe('PlayerSettings', () => {
  // A tab is picked as it is pressed and again as it takes the focus, the settings unchanged until the
  // page passes them back: what it asks for last is what counts.
  test('sets the speed picked', async () => {
    const { user, onSettings } = await openSettings();

    await user.click(screen.getByRole('tab', { name: '4×' }));

    expect(onSettings).toHaveBeenLastCalledWith({ speed: 4 });
  });

  test('sets the camera picked, and says what the one set does', async () => {
    const { user, onSettings } = await openSettings();

    expect(screen.getByRole('tab', { name: 'Follow', selected: true })).toBeTruthy();
    expect(screen.getByText('Goes to each change; in 3D, rides along the line as it grows')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Overview' }));

    expect(onSettings).toHaveBeenLastCalledWith({ camera: 'overview' });
  });

  test('turns the minimap off', async () => {
    const { user, onSettings } = await openSettings();

    await user.click(screen.getByRole('switch', { name: /Minimap/ }));

    expect(onSettings).toHaveBeenCalledExactlyOnceWith({ minimap: false });
  });

  test('offers no minimap on a phone', async () => {
    await openSettings(true);

    expect(screen.queryByRole('switch', { name: /Minimap/ })).toBeNull();
  });
});
