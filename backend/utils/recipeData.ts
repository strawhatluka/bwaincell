// Movie data for the /random movie command

export const movieData: Record<
  string,
  {
    year: string;
    genre: string;
    rating: string;
    link: string;
  }
> = {
  'The Shawshank Redemption': {
    year: '1994',
    genre: 'Drama',
    rating: '9.3',
    link: 'https://www.imdb.com/title/tt0111161/',
  },
  'The Dark Knight': {
    year: '2008',
    genre: 'Action',
    rating: '9.0',
    link: 'https://www.imdb.com/title/tt0468569/',
  },
  Inception: {
    year: '2010',
    genre: 'Sci-Fi',
    rating: '8.8',
    link: 'https://www.imdb.com/title/tt1375666/',
  },
  'Pulp Fiction': {
    year: '1994',
    genre: 'Crime',
    rating: '8.9',
    link: 'https://www.imdb.com/title/tt0110912/',
  },
  'Forrest Gump': {
    year: '1994',
    genre: 'Drama',
    rating: '8.8',
    link: 'https://www.imdb.com/title/tt0109830/',
  },
  'The Matrix': {
    year: '1999',
    genre: 'Sci-Fi',
    rating: '8.7',
    link: 'https://www.imdb.com/title/tt0133093/',
  },
  Interstellar: {
    year: '2014',
    genre: 'Sci-Fi',
    rating: '8.7',
    link: 'https://www.imdb.com/title/tt0816692/',
  },
  'The Godfather': {
    year: '1972',
    genre: 'Crime',
    rating: '9.2',
    link: 'https://www.imdb.com/title/tt0068646/',
  },
};
