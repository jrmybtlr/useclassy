import { describe, it, expect, beforeEach, vi } from 'vitest';
import classyPlugin from './classy';

beforeEach(() =>
{
    document.body.innerHTML = '';
});

it('should transform <div class:hover="text-red" /> attribute into <div class="hover:text-red" />', () =>
{
    const element = document.createElement('div');
    element.setAttribute('class', 'text-black');
    element.setAttribute('class:hover', 'text-red');
    element.setAttribute('class:dark', 'text-white');
    const result = classyPlugin({ element });
    expect(result).toBe('text-black hover:text-red dark:text-white');
});