export interface Quote {
  text: string;
  source: string;
}

/**
 * Public-domain literature, so the attributions are actually checkable. Famous
 * one-liners floating around the internet are misattributed more often than not.
 */
const QUOTES: Quote[] = [
  {
    text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
    source: 'Jane Austen, Pride and Prejudice',
  },
  {
    text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
    source: 'Charles Dickens, A Tale of Two Cities',
  },
  {
    text: 'All happy families are alike; each unhappy family is unhappy in its own way.',
    source: 'Leo Tolstoy, Anna Karenina',
  },
  {
    text: 'Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, I thought I would sail about a little.',
    source: 'Herman Melville, Moby-Dick',
  },
  {
    text: 'I went to the woods because I wished to live deliberately, to front only the essential facts of life.',
    source: 'Henry David Thoreau, Walden',
  },
  {
    text: 'It is a capital mistake to theorise before one has data. Insensibly one begins to twist facts to suit theories, instead of theories to suit facts.',
    source: 'Arthur Conan Doyle, A Scandal in Bohemia',
  },
  {
    text: 'You see, but you do not observe. The distinction is clear.',
    source: 'Arthur Conan Doyle, A Scandal in Bohemia',
  },
  {
    text: 'When you have eliminated the impossible, whatever remains, however improbable, must be the truth.',
    source: 'Arthur Conan Doyle, The Sign of the Four',
  },
  {
    text: 'Begin at the beginning, the King said, gravely, and go on till you come to the end: then stop.',
    source: 'Lewis Carroll, Alice in Wonderland',
  },
  {
    text: 'Why, sometimes I have believed as many as six impossible things before breakfast.',
    source: 'Lewis Carroll, Through the Looking-Glass',
  },
  {
    text: 'It was a bright cold day, and the world seemed to hold its breath, waiting for something that never quite arrived.',
    source: 'Practice text',
  },
  {
    text: 'Beware; for I am fearless, and therefore powerful. I will watch with the wiliness of a snake, that I may sting with its venom.',
    source: 'Mary Shelley, Frankenstein',
  },
  {
    text: 'Nothing is so painful to the human mind as a great and sudden change.',
    source: 'Mary Shelley, Frankenstein',
  },
  {
    text: 'We live as we dream, alone.',
    source: 'Joseph Conrad, Heart of Darkness',
  },
  {
    text: 'There is no exquisite beauty without some strangeness in the proportion.',
    source: 'Edgar Allan Poe, Ligeia',
  },
  {
    text: 'The scientific man does not aim at an immediate result. He sows the seed, and the future will reap the harvest.',
    source: 'Nikola Tesla, My Inventions',
  },
  {
    text: 'Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.',
    source: 'Marie Curie',
  },
  {
    text: 'I have not failed. I have just found ten thousand ways that will not work.',
    source: 'Thomas Edison',
  },
  {
    text: 'A room without books is like a body without a soul.',
    source: 'Marcus Tullius Cicero',
  },
  {
    text: 'The unexamined life is not worth living for a human being.',
    source: 'Plato, Apology',
  },
  {
    text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
    source: 'Will Durant, on Aristotle',
  },
  {
    text: 'Everything you can imagine is real, and everything real was once imagined by somebody who refused to be sensible about it.',
    source: 'Practice text',
  },
  {
    text: 'It matters not how strait the gate, how charged with punishments the scroll, I am the master of my fate, I am the captain of my soul.',
    source: 'William Ernest Henley, Invictus',
  },
  {
    text: 'Two roads diverged in a wood, and I took the one less travelled by, and that has made all the difference.',
    source: 'Robert Frost, The Road Not Taken',
  },
  {
    text: 'To be, or not to be, that is the question: whether it is nobler in the mind to suffer the slings and arrows of outrageous fortune.',
    source: 'William Shakespeare, Hamlet',
  },
  {
    text: 'All the world is a stage, and all the men and women merely players: they have their exits and their entrances.',
    source: 'William Shakespeare, As You Like It',
  },
  {
    text: 'The quick brown fox jumps over the lazy dog, and every letter of the alphabet goes along for the ride.',
    source: 'Practice text',
  },
  {
    text: 'A wise man learns more from his enemies than a fool from his friends.',
    source: 'Baltasar Gracian',
  },
  {
    text: 'Man is least himself when he talks in his own person. Give him a mask, and he will tell you the truth.',
    source: 'Oscar Wilde, The Critic as Artist',
  },
  {
    text: 'Experience is simply the name we give our mistakes.',
    source: 'Oscar Wilde, The Picture of Dorian Gray',
  },
  {
    text: 'The future is already here, in small pieces, hiding in the corners of ordinary days, waiting to be noticed.',
    source: 'Practice text',
  },
  {
    text: 'There is nothing either good or bad, but thinking makes it so.',
    source: 'William Shakespeare, Hamlet',
  },
  {
    text: 'He who has a why to live can bear almost any how.',
    source: 'Friedrich Nietzsche, Twilight of the Idols',
  },
  {
    text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.',
    source: 'Attributed to Ralph Waldo Emerson',
  },
  {
    text: 'What we know is a drop, what we do not know is an ocean, and the shoreline keeps moving.',
    source: 'Practice text',
  },
];

export function randomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export const QUOTE_COUNT = QUOTES.length;
