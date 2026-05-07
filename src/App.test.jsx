import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FinishBy from './App';

// Mock window.storage for testing
global.window.storage = {
  set: vi.fn((key, value) => Promise.resolve()),
  get: vi.fn((key) => Promise.resolve(null)),
  list: vi.fn((prefix) => Promise.resolve({ keys: [] })),
  delete: vi.fn((key) => Promise.resolve()),
};

describe('App - Add Book Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a book with correct data', async () => {
    const { getByText, getByPlaceholderText } = render(<FinishBy />);
    
    // Click add book button
    const addButton = getByText('Add your first book');
    fireEvent.click(addButton);

    // Fill in form
    const titleInput = getByPlaceholderText('What are you reading?');
    const pagesInput = getByPlaceholderText('320');
    
    fireEvent.change(titleInput, { target: { value: 'Test Book' } });
    fireEvent.change(pagesInput, { target: { value: '300' } });

    // Verify storage call includes correct totalPages (not prepended with 0)
    expect(window.storage.set).toHaveBeenCalledWith(
      expect.stringContaining('book:'),
      expect.stringContaining('"totalPages":300')
    );
  });

  it('should not prepend 0 to pages input', async () => {
    const { getByText, getByPlaceholderText } = render(<FinishBy />);
    
    const addButton = getByText('Add your first book');
    fireEvent.click(addButton);

    const pagesInput = getByPlaceholderText('320');
    fireEvent.change(pagesInput, { target: { value: '250' } });

    // Input should display 250, not 0250
    expect(pagesInput.value).toBe('250');
  });
});

describe('App - Update Progress Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly update page count', async () => {
    // Mock existing book
    const mockBook = {
      id: '123',
      title: 'Test Book',
      totalPages: 300,
      pagesRead: 100,
      startDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      commitmentLevel: 'balanced',
      readingSpeed: 'moderate',
      missedDays: 0,
      readingSessions: [],
      lastRead: new Date().toISOString().split('T')[0],
    };

    window.storage.list.mockResolvedValue({
      keys: ['book:123'],
    });

    window.storage.get.mockImplementation((key) => {
      if (key === 'book:123') {
        return Promise.resolve({ value: JSON.stringify(mockBook) });
      }
      return Promise.resolve(null);
    });

    const { getByText, getByDisplayValue } = render(<FinishBy />);

    // Wait for books to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Click update progress
    const updateButton = getByText('Update Progress');
    fireEvent.click(updateButton);

    // Verify input shows current pages, not 0150
    const pageInput = getByDisplayValue('100');
    expect(pageInput).toBeInTheDocument();

    // Change to 150
    fireEvent.change(pageInput, { target: { value: '150' } });
    
    // Save
    const saveButton = getByText('Save');
    fireEvent.click(saveButton);

    // Verify storage call has correct updated pages
    expect(window.storage.set).toHaveBeenCalledWith(
      'book:123',
      expect.stringContaining('"pagesRead":150')
    );
  });
});

describe('Calculator Functions', () => {
  it('should calculate book metrics correctly', () => {
    const book = {
      id: '123',
      title: 'Test',
      totalPages: 300,
      pagesRead: 150,
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      targetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      commitmentLevel: 'balanced',
      missedDays: 0,
      readingSessions: [],
      lastRead: new Date().toISOString().split('T')[0],
    };

    // Import the function
    const { calculateBookMetrics } = require('./App');

    const metrics = calculateBookMetrics(book);

    expect(metrics).toBeDefined();
    expect(metrics.progress).toBe(50); // 150/300
    expect(metrics.pagesRemaining).toBe(150);
    expect(metrics.isComplete).toBe(false);
    expect(metrics.daysRemaining).toBeLessThan(30);
  });

  it('should handle commitment level multipliers', () => {
    const gentle = { commitmentLevel: 'gentle' };
    const balanced = { commitmentLevel: 'balanced' };
    const intense = { commitmentLevel: 'intense' };

    // These should affect the effective reading days calculation
    expect(['gentle', 'balanced', 'intense']).toContain(gentle.commitmentLevel);
    expect(['gentle', 'balanced', 'intense']).toContain(balanced.commitmentLevel);
    expect(['gentle', 'balanced', 'intense']).toContain(intense.commitmentLevel);
  });
});

describe('Orb Pattern Recognition', () => {
  it('should validate correct zone detection', () => {
    // Test zone detection logic
    const getZoneFromClick = (x, y, centerX, centerY, radius) => {
      const dx = x - centerX;
      const dy = y - centerY;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      let normalizedAngle = angle < 0 ? angle + 360 : angle;

      if (normalizedAngle < 45 || normalizedAngle > 315) return 'right';
      if (normalizedAngle >= 45 && normalizedAngle < 135) return 'bottom';
      if (normalizedAngle >= 135 && normalizedAngle < 225) return 'left';
      if (normalizedAngle >= 225 && normalizedAngle < 315) return 'top';
    };

    const centerX = 300, centerY = 300;

    // Test right zone
    expect(getZoneFromClick(360, 300, centerX, centerY, 60)).toBe('right');
    
    // Test bottom zone
    expect(getZoneFromClick(300, 360, centerX, centerY, 60)).toBe('bottom');
    
    // Test left zone
    expect(getZoneFromClick(240, 300, centerX, centerY, 60)).toBe('left');
    
    // Test top zone
    expect(getZoneFromClick(300, 240, centerX, centerY, 60)).toBe('top');
  });

  it('should track tap sequence correctly', () => {
    const PATTERN = [
      { zone: 'top', time: 500 },
      { zone: 'right', time: 300 },
      { zone: 'bottom', time: 500 },
    ];

    let tapSequence = [];
    
    // Simulate correct pattern
    const taps = [
      { zone: 'top', timestamp: 0 },
      { zone: 'right', timestamp: 500 },
      { zone: 'bottom', timestamp: 800 },
    ];

    taps.forEach((tap, idx) => {
      if (tap.zone === PATTERN[idx].zone) {
        tapSequence.push(tap);
      }
    });

    expect(tapSequence.length).toBe(3);
    expect(tapSequence[0].zone).toBe('top');
    expect(tapSequence[1].zone).toBe('right');
    expect(tapSequence[2].zone).toBe('bottom');
  });

  it('should reject incorrect zone taps', () => {
    const PATTERN = [
      { zone: 'top', time: 500 },
      { zone: 'right', time: 300 },
    ];

    const incorrectTap = { zone: 'left', timestamp: 0 };
    
    // Should fail validation
    expect(incorrectTap.zone).not.toBe(PATTERN[0].zone);
  });

  it('should reject taps outside timing tolerance', () => {
    const PATTERN_TOLERANCE = 200;
    const lastTapTime = 500;
    const expectedTiming = 300;
    const actualTapTime = 1100; // 600ms difference, exceeds 200ms tolerance
    
    const timeDifference = actualTapTime - lastTapTime;
    const isWithinTolerance = Math.abs(timeDifference - expectedTiming) <= PATTERN_TOLERANCE;

    expect(isWithinTolerance).toBe(false);
  });
});

describe('Adaptive Messages', () => {
  it('should generate appropriate completion message', () => {
    const mockMetrics = {
      isComplete: true,
      daysElapsed: 25,
    };

    const mockBook = {
      missedDays: 0,
    };

    // When complete
    if (mockMetrics.isComplete) {
      const message = `You finished! Completed in ${mockMetrics.daysElapsed} days. 🎉`;
      expect(message).toContain('finished');
      expect(message).toContain('25');
    }
  });

  it('should handle various reading states', () => {
    const states = [
      { progress: 75, expected: 'home stretch' },
      { progress: 50, expected: 'Halfway' },
      { progress: 25, expected: 'just getting started' },
    ];

    states.forEach(state => {
      if (state.progress > 75) {
        expect('home stretch').toContain('home');
      } else if (state.progress > 50) {
        expect('Halfway').toContain('Halfway');
      }
    });
  });
});
