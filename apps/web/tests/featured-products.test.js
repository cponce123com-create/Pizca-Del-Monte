/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FeaturedProducts } from '../src/components/home/featured-products';
import { demoProducts } from '../src/lib/demo-products';

test('los destacados usan los precios y enlaces del catálogo', () => {
  render(<FeaturedProducts />);
  for (const product of demoProducts.filter(item => item.isFeatured).slice(0, 4)) {
    const link = screen.getByRole('link', { name: new RegExp(product.name, 'i') });
    expect(link.getAttribute('href')).toBe(`/producto/${product.slug}`);
    expect(link.textContent).toContain(product.formattedPrice);
  }
});
