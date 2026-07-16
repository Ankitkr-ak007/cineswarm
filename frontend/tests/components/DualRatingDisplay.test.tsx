import { render, screen } from '@testing-library/react';
import { DualRatingDisplay } from '@/components/DualRatingDisplay';

describe('DualRatingDisplay', () => {
  it('renders correctly without data (unfinalized)', () => {
    render(<DualRatingDisplay finalized={false} />);
    
    expect(screen.getByText('TMDB Rating')).toBeInTheDocument();
    expect(screen.getByText('Swarm Consensus')).toBeInTheDocument();
    // It should render "--/10" twice
    const dashes = screen.getAllByText('--');
    expect(dashes).toHaveLength(2);
  });

  it('renders correctly with actual rating but no consensus yet', () => {
    render(<DualRatingDisplay actualRating={8.5} finalized={false} />);
    
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('renders correctly with both ratings and finalized state', () => {
    render(<DualRatingDisplay actualRating={8.5} consensusScore={9.2} finalized={true} />);
    
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('9.2')).toBeInTheDocument();
    
    // Check if the consensus score has the green finalized color class (indirectly testing the logic)
    const consensusEl = screen.getByText(/9\.2/);
    expect(consensusEl).toHaveClass('text-green-400');
  });
});
