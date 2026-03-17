export interface Book {
  id: string;
  title: string;
  author: string;
  categories?: string[];
  category?: string;
  isbn?: string;
  thumbnail?: string;
  coverUrl?: string;
  owner?: string;
  tags?: string[];
  price?: number | null;
  purchaseDate?: string;
  comments?: string;
  source?: string;
  isWishlist?: boolean;
  userId: string;
  addedBy?: string;
  averageRating?: number;
  ratingCount?: number;
  borrowedBy?: string;
  borrowDate?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  // Computed properties (from normalization)
  _genres: string[];
  _searchBlob: string;
  _createdTime: number;
  _purchaseTime: number;
}

export interface ReadingStatus {
  status: 'want_to_read' | 'reading' | 'finished' | 'unread';
  rating: number;
  progress: number;
  comment: string;
  userId: string;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  completedBooksCount: number;
  updatedAt?: unknown;
}

export interface Partnership {
  id: string;
  userId1: string;
  userId2: string;
  initiatorId: string;
  user1Unsubscribed: boolean;
  user2Unsubscribed: boolean;
  allowAddBooks: boolean;
  createdAt?: unknown;
}

export interface ActivityEvent {
  id: string;
  type: 'book_added' | 'status_updated' | 'rating_updated' | 'book_borrowed' | 'book_returned' | 'metadata_updated';
  bookId?: string;
  bookTitle?: string;
  title?: string;
  userName?: string;
  addedBy?: string;
  userId: string;
  addedTo?: string;
  libraryId: string;
  libraryName?: string;
  timestamp: unknown;
  status?: string;
  rating?: number;
  comment?: string;
  borrowedBy?: string;
  metadataType?: string;
  oldValue?: string;
  newValue?: string;
}
