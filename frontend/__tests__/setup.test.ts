describe('Frontend Test Infrastructure', () => {
  it('should run tests', () => {
    expect(true).toBe(true);
  });

  it('should have jest-dom matchers available', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    document.body.appendChild(div);
    expect(div).toBeInTheDocument();
    document.body.removeChild(div);
  });
});
