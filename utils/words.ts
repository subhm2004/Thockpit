import { TestOptions } from '@/types';

/**
 * The common English words a typing test should draw from. The old list was ~170
 * words, which meant the same handful kept coming round inside a single test.
 */
const WORD_LIST = [
  'the', 'be', 'of', 'and', 'a', 'to', 'in', 'he', 'have', 'it',
  'that', 'for', 'they', 'with', 'as', 'not', 'on', 'she', 'at', 'by',
  'this', 'we', 'you', 'do', 'but', 'from', 'or', 'which', 'one', 'would',
  'all', 'will', 'there', 'say', 'who', 'make', 'when', 'can', 'more', 'if',
  'no', 'man', 'out', 'other', 'so', 'what', 'time', 'up', 'go', 'about',
  'than', 'into', 'could', 'state', 'only', 'new', 'year', 'some', 'take', 'come',
  'these', 'know', 'see', 'use', 'get', 'like', 'then', 'first', 'any', 'work',
  'now', 'may', 'such', 'give', 'over', 'think', 'most', 'even', 'find', 'day',
  'also', 'after', 'way', 'many', 'must', 'look', 'before', 'great', 'back', 'through',
  'long', 'where', 'much', 'should', 'well', 'people', 'down', 'own', 'just', 'because',
  'good', 'each', 'those', 'feel', 'seem', 'how', 'high', 'too', 'place', 'little',
  'world', 'very', 'still', 'hand', 'old', 'life', 'tell', 'write', 'become', 'here',
  'show', 'house', 'both', 'between', 'need', 'mean', 'call', 'develop', 'under', 'last',
  'right', 'move', 'thing', 'general', 'school', 'never', 'same', 'another', 'begin', 'while',
  'number', 'part', 'turn', 'real', 'leave', 'might', 'want', 'point', 'form', 'off',
  'child', 'few', 'small', 'since', 'against', 'ask', 'late', 'home', 'interest', 'large',
  'person', 'end', 'open', 'public', 'follow', 'during', 'present', 'without', 'again', 'hold',
  'around', 'possible', 'head', 'consider', 'word', 'program', 'problem', 'however', 'lead', 'system',
  'set', 'order', 'eye', 'plan', 'run', 'keep', 'face', 'fact', 'group', 'play',
  'stand', 'increase', 'early', 'course', 'change', 'help', 'line', 'city', 'put', 'close',
  'case', 'force', 'meet', 'once', 'water', 'upon', 'build', 'hear', 'light', 'live',
  'every', 'country', 'bring', 'center', 'let', 'side', 'try', 'provide', 'continue', 'name',
  'certain', 'power', 'pay', 'result', 'question', 'study', 'woman', 'member', 'until', 'far',
  'night', 'always', 'service', 'away', 'report', 'something', 'company', 'week', 'toward', 'start',
  'social', 'room', 'figure', 'nature', 'though', 'young', 'less', 'enough', 'almost', 'read',
  'include', 'nothing', 'yet', 'better', 'big', 'boy', 'cost', 'business', 'value', 'second',
  'why', 'clear', 'expect', 'family', 'complete', 'act', 'sense', 'mind', 'experience', 'art',
  'next', 'near', 'direct', 'car', 'law', 'industry', 'important', 'girl', 'several', 'matter',
  'usual', 'rather', 'often', 'kind', 'among', 'white', 'reason', 'action', 'return', 'foot',
  'care', 'simple', 'within', 'love', 'human', 'along', 'appear', 'doctor', 'believe', 'speak',
  'active', 'student', 'month', 'drive', 'concern', 'best', 'door', 'hope', 'example', 'inform',
  'body', 'ever', 'least', 'understand', 'reach', 'effect', 'different', 'idea', 'whole', 'control',
  'condition', 'field', 'pass', 'fall', 'note', 'special', 'talk', 'particular', 'today', 'measure',
  'walk', 'teach', 'low', 'hour', 'type', 'carry', 'rate', 'remain', 'full', 'street',
  'easy', 'although', 'record', 'sit', 'determine', 'level', 'local', 'sure', 'receive', 'thus',
  'moment', 'spirit', 'train', 'college', 'perhaps', 'music', 'grow', 'free', 'cause', 'serve',
  'age', 'book', 'board', 'recent', 'sound', 'office', 'cut', 'step', 'class', 'true',
  'history', 'position', 'above', 'strong', 'friend', 'necessary', 'add', 'court', 'deal', 'support',
  'party', 'whether', 'either', 'land', 'material', 'happen', 'education', 'death', 'agree', 'arm',
  'mother', 'across', 'quite', 'anything', 'town', 'past', 'view', 'society', 'manage', 'answer',
  'break', 'organize', 'half', 'fire', 'lose', 'money', 'stop', 'actual', 'already', 'effort',
  'wait', 'department', 'able', 'political', 'learn', 'voice', 'air', 'together', 'shall', 'cover',
  'common', 'subject', 'draw', 'short', 'wife', 'treat', 'limit', 'road', 'letter', 'color',
  'behind', 'produce', 'send', 'term', 'total', 'university', 'rise', 'century', 'success', 'minute',
  'remember', 'purpose', 'test', 'fight', 'watch', 'situation', 'south', 'ago', 'difference', 'stage',
  'father', 'table', 'rest', 'bear', 'entire', 'market', 'prepare', 'explain', 'offer', 'plant',
  'charge', 'ground', 'west', 'picture', 'hard', 'front', 'lie', 'modern', 'dark', 'surface',
  'rule', 'regard', 'dance', 'peace', 'observe', 'future', 'wall', 'farm', 'claim', 'firm',
  'operation', 'further', 'pressure', 'property', 'morning', 'amount', 'top', 'outside', 'piece', 'sometimes',
  'beauty', 'trade', 'chance', 'fear', 'arrive', 'demand', 'radio', 'opportunity', 'wish', 'sell',
  'north', 'race', 'window', 'suggest', 'range', 'exist', 'press', 'eat', 'account', 'evening',
  'quality', 'yes', 'attention', 'wear', 'fill', 'green', 'apply', 'movement', 'central', 'film',
  'fine', 'simply', 'independent', 'reduce', 'stock', 'phone', 'major', 'store', 'design', 'style',
  'space', 'kitchen', 'garden', 'summer', 'winter', 'spring', 'evidence', 'popular', 'safe', 'medical',
  'clean', 'tree', 'foreign', 'floor', 'brother', 'sister', 'daughter', 'son', 'baby', 'animal',
  'bird', 'dog', 'cat', 'horse', 'fish', 'food', 'bread', 'meat', 'fruit', 'sugar',
  'salt', 'coffee', 'wine', 'glass', 'plate', 'knife', 'chair', 'bed', 'clock', 'paper',
  'pencil', 'card', 'photo', 'camera', 'screen', 'button', 'switch', 'engine', 'metal', 'stone',
  'wood', 'plastic', 'paint', 'brush', 'cloud', 'rain', 'snow', 'wind', 'storm', 'sun',
  'moon', 'star', 'sky', 'sea', 'river', 'lake', 'mountain', 'hill', 'valley', 'forest',
  'beach', 'island', 'desert', 'village', 'bridge', 'tower', 'castle', 'hotel', 'station', 'airport',
  'plane', 'ship', 'boat', 'truck', 'bike', 'wheel', 'travel', 'journey', 'holiday', 'ticket',
  'map', 'east', 'left', 'straight', 'corner', 'edge', 'middle', 'bottom', 'inside', 'below',
  'beside', 'beyond', 'happy', 'sad', 'angry', 'afraid', 'proud', 'tired', 'hungry', 'thirsty',
  'sick', 'healthy', 'rich', 'poor', 'famous', 'strange', 'normal', 'perfect', 'terrible', 'wonderful',
  'beautiful', 'ugly', 'clever', 'stupid', 'brave', 'quiet', 'loud', 'gentle', 'rough', 'smooth',
  'sharp', 'flat', 'deep', 'shallow', 'wide', 'narrow', 'thick', 'thin', 'heavy', 'empty',
  'dirty', 'fresh', 'warm', 'cool', 'cold', 'hot', 'dry', 'wet', 'bright', 'sweet',
  'sour', 'bitter', 'red', 'blue', 'yellow', 'black', 'brown', 'grey', 'silver', 'gold',
  'purple', 'orange', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'hundred', 'thousand', 'million', 'third', 'single', 'double', 'monday', 'tuesday', 'friday',
  'sunday', 'january', 'march', 'april', 'june', 'july', 'august', 'jump', 'climb', 'swim',
  'throw', 'catch', 'push', 'pull', 'lift', 'drop', 'shake', 'touch', 'hit', 'kick',
  'ride', 'fly', 'sail', 'dig', 'fix', 'wash', 'cook', 'bake', 'burn', 'melt',
  'freeze', 'boil', 'feed', 'hunt', 'search', 'hide', 'seek', 'chase', 'escape', 'save',
  'protect', 'attack', 'defend', 'win', 'game', 'sport', 'team', 'match', 'score', 'goal',
  'prize', 'medal', 'speed', 'slow', 'quick', 'fast', 'rush', 'stay', 'enter', 'exit',
  'finish', 'repeat', 'improve', 'spread', 'gather', 'collect', 'divide', 'share', 'lend', 'borrow',
  'buy', 'spend', 'earn', 'owe', 'count', 'weigh', 'compare', 'choose', 'decide', 'perform',
  'listen', 'notice', 'discover', 'invent', 'create', 'repair', 'destroy', 'damage', 'harm', 'heal',
  'cure', 'doubt', 'guess', 'realize', 'forget', 'imagine', 'dream', 'prefer', 'hate', 'enjoy',
  'worry', 'trust', 'respect', 'admire', 'praise', 'blame', 'forgive', 'thank', 'greet', 'welcome',
  'invite', 'visit', 'join', 'separate', 'reply', 'describe', 'discuss', 'argue', 'refuse', 'accept',
  'promise', 'warn', 'advise', 'complain', 'shout', 'whisper', 'laugh', 'smile', 'cry', 'sigh',
  'breathe', 'sleep', 'wake', 'relax', 'job', 'career', 'factory', 'shop', 'bank', 'hospital',
  'library', 'museum', 'theatre', 'restaurant', 'path', 'gate', 'roof', 'stair', 'key', 'lock',
  'box', 'bag', 'basket', 'bottle', 'cup', 'bowl', 'spoon', 'fork', 'towel', 'soap',
  'mirror', 'lamp', 'candle', 'smoke', 'dust', 'mud', 'sand', 'rock', 'ice', 'steam',
  'oil', 'gas', 'iron', 'steel', 'copper', 'coal', 'seed', 'root', 'leaf', 'branch',
  'flower', 'grass', 'crop', 'harvest', 'farmer', 'worker', 'driver', 'teacher', 'nurse', 'artist',
  'writer', 'singer', 'dancer', 'player', 'soldier', 'sailor', 'pilot', 'guard', 'judge', 'lawyer',
  'seller', 'buyer', 'owner', 'guest', 'stranger', 'partner', 'leader', 'winner', 'crowd', 'nation',
  'culture', 'language', 'science', 'weather', 'season', 'tomorrow', 'yesterday', 'tonight', 'weekend', 'rarely',
  'soon', 'later', 'suddenly', 'finally', 'quickly', 'slowly', 'carefully', 'easily', 'hardly', 'nearly',
  'exactly', 'clearly', 'mostly', 'partly', 'really', 'truly', 'merely', 'barely', 'anyone', 'someone',
  'everyone', 'nobody', 'everything', 'nowhere', 'somewhere', 'anywhere', 'everywhere', 'myself', 'himself', 'herself',
];

const PUNCTUATION = ['.', ',', ';', ':', '!', '?', '(', ')', '"', "'"];

/** A duplicate would just come up twice as often as it should. */
const WORDS = Array.from(new Set(WORD_LIST));

export function generateWords(
  count: number,
  options: TestOptions = { punctuation: false, numbers: false, capitals: false }
): string[] {
  const words: string[] = [];

  for (let i = 0; i < count; i++) {
    let word = WORDS[Math.floor(Math.random() * WORDS.length)];

    if (options.capitals) {
      // 20% chance to capitalize a word
      if (Math.random() < 0.2 || i === 0) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
    }

    if (options.punctuation) {
      // 10% chance to add punctuation
      if (Math.random() < 0.1) {
        const p = PUNCTUATION[Math.floor(Math.random() * PUNCTUATION.length)];
        if (p === '(') {
          word = '(' + word + ')';
        } else if (p === '"') {
          word = '"' + word + '"';
        } else {
          word = word + p;
        }
      }
    }

    if (options.numbers) {
      // 5% chance to replace word with a number
      if (Math.random() < 0.05) {
        word = Math.floor(Math.random() * 1000).toString();
      }
    }

    words.push(word);
  }

  return words;
}
