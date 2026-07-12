import { describe, it, expect } from 'vitest'
import { mediaFileName, baseDomain, isAllowedMediaHost } from '../media'

describe('mediaFileName', () => {
  it('erzeugt Dateinamen für gültige numerische IDs', () => {
    expect(mediaFileName(42, 'cover')).toBe('42.jpg')
    expect(mediaFileName(42, 'backdrop')).toBe('42_backdrop.jpg')
    expect(mediaFileName(42, 'actor')).toBe('actor_42.jpg')
    expect(mediaFileName('7', 'cover')).toBe('7.jpg')
    expect(mediaFileName(0, 'cover')).toBe('0.jpg')
  })

  it('lehnt nicht-numerische und negative IDs ab (Pfad-Traversal)', () => {
    expect(mediaFileName('../../evil', 'cover')).toBeNull()
    expect(mediaFileName('..\\..\\evil', 'backdrop')).toBeNull()
    expect(mediaFileName(-1, 'cover')).toBeNull()
    expect(mediaFileName(1.5, 'cover')).toBeNull()
    expect(mediaFileName(NaN, 'cover')).toBeNull()
    expect(mediaFileName(undefined, 'cover')).toBeNull()
    expect(mediaFileName(null, 'actor')).toBe('actor_0.jpg') // Number(null) === 0 – harmlos
  })
})

describe('baseDomain', () => {
  it('liefert die letzten zwei Labels für normale Domains', () => {
    expect(baseDomain('example.com')).toBe('example.com')
    expect(baseDomain('medien.example.com')).toBe('example.com')
    expect(baseDomain('a.b.example.com')).toBe('example.com')
  })

  it('behandelt öffentliche Second-Level-TLDs (co.uk etc.) korrekt', () => {
    expect(baseDomain('shelf.example.co.uk')).toBe('example.co.uk')
    expect(baseDomain('example.co.uk')).toBe('example.co.uk')
    expect(baseDomain('shelf.example.com.au')).toBe('example.com.au')
  })

  it('lässt IPv4-Adressen unverändert', () => {
    expect(baseDomain('192.168.1.10')).toBe('192.168.1.10')
  })
})

describe('isAllowedMediaHost', () => {
  const shelf = new URL('https://shelf.example.com')

  it('erlaubt denselben Origin und Subdomains derselben Domain', () => {
    expect(isAllowedMediaHost(new URL('https://shelf.example.com/img.jpg'), shelf)).toBe(true)
    expect(isAllowedMediaHost(new URL('https://medien.example.com/img.jpg'), shelf)).toBe(true)
  })

  it('blockiert fremde Hosts und andere Protokolle', () => {
    expect(isAllowedMediaHost(new URL('https://image.tmdb.org/img.jpg'), shelf)).toBe(false)
    expect(isAllowedMediaHost(new URL('http://medien.example.com/img.jpg'), shelf)).toBe(false)
  })

  it('erlaubt bei co.uk-Shelf keine fremden co.uk-Domains', () => {
    const ukShelf = new URL('https://meineshelf.co.uk')
    expect(isAllowedMediaHost(new URL('https://evil-fremd.co.uk/img.jpg'), ukShelf)).toBe(false)
    expect(isAllowedMediaHost(new URL('https://medien.meineshelf.co.uk/img.jpg'), ukShelf)).toBe(true)
  })
})
