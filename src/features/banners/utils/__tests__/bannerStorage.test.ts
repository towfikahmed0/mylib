import { beforeEach, describe, expect, it } from 'vitest'
import {
  dismissBannerId,
  getDismissedBannerIds,
  isBannerDismissed,
} from '../bannerStorage'
import { BANNER_STORAGE_KEY } from '../../constants'

describe('bannerStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns empty array when nothing is stored', () => {
    expect(getDismissedBannerIds()).toEqual([])
    expect(isBannerDismissed('banner-1')).toBe(false)
  })

  it('stores and checks dismissed banner IDs', () => {
    dismissBannerId('banner-1')
    expect(isBannerDismissed('banner-1')).toBe(true)
    expect(isBannerDismissed('banner-2')).toBe(false)
    expect(getDismissedBannerIds()).toEqual(['banner-1'])
  })

  it('avoids duplicates when dismissing the same banner multiple times', () => {
    dismissBannerId('banner-1')
    dismissBannerId('banner-1')
    dismissBannerId('banner-2')
    expect(getDismissedBannerIds()).toEqual(['banner-1', 'banner-2'])
  })

  it('handles invalid JSON in localStorage gracefully without throwing', () => {
    window.localStorage.setItem(BANNER_STORAGE_KEY, 'invalid json {')
    expect(getDismissedBannerIds()).toEqual([])
    expect(isBannerDismissed('banner-1')).toBe(false)

    // Should recover and allow new dismissals
    dismissBannerId('banner-3')
    expect(isBannerDismissed('banner-3')).toBe(true)
  })
})
