import { hiddenNetwork } from '@raillineage/network/testing/hiddenNetwork';
import { lineId } from '@raillineage/schema/testing/ids';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';
import { describe, expect, test, vi } from 'vitest';
import { renderInApp } from '@test/support/component.utils';
import { openExplorer } from '@test/support/factories/explorer.utils';
import LinesSection from '~/features/explorer/lines/components/LinesSection.vue';
import { useNetworkStore } from '~/features/explorer/network.store';
import { usePanelStore } from '~/features/explorer/panel/panel.store';

/**
 * The Lines tab, as the explorer lays it out for a page opened on the network with a hidden one beside
 * it: its lines, its networks to show or hide, what had opened by the date shown.
 *
 * @returns What it asks: lines shown or hidden, a line opened.
 */
const renderLines = async () => {
  openExplorer({}, hiddenNetwork());
  const { lines, networkChoices } = useNetworkStore();
  const { linesOpened } = usePanelStore();
  const onShow = vi.fn();
  const onOpen = vi.fn();
  await renderInApp(LinesSection, { lines, choices: networkChoices, opened: linesOpened, onShow, onOpen });
  return { user: userEvent.setup(), onShow, onOpen };
};

describe('LinesSection', () => {
  test("lists each network's lines, a hidden one named only, to show again", async () => {
    await renderLines();

    expect(screen.getByRole('heading', { name: 'Metro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Red/ })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Rail' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show Grey' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Grey/ })).toBeNull();
  });

  test('opens a line clicked', async () => {
    const { user, onOpen } = await renderLines();

    await user.click(screen.getByRole('button', { name: /^Red/ }));

    expect(onOpen).toHaveBeenCalledExactlyOnceWith(lineId('red'));
  });

  test("shows a hidden line, or a network's at once", async () => {
    const { user, onShow } = await renderLines();

    await user.click(screen.getByRole('button', { name: 'Show Grey' }));
    await user.click(screen.getByRole('button', { name: 'Show all Rail lines' }));

    expect(onShow.mock.calls).toEqual([
      [[lineId('grey')], true],
      [[lineId('grey')], true],
    ]);
  });

  test('finds lines by name, and says when none matches', async () => {
    const { user } = await renderLines();

    await user.type(screen.getByRole('textbox', { name: 'Search lines' }), 'gre');

    expect(screen.getByRole('button', { name: /^Green/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Red/ })).toBeNull();
    await user.type(screen.getByRole('textbox', { name: 'Search lines' }), 'xyz');
    expect(screen.getByText('No line matches')).toBeTruthy();
  });
});
