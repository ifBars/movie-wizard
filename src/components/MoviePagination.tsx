type MoviePaginationProps = {
  title: string;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

export function MoviePagination({ title, page, pageCount, onPageChange }: MoviePaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav className="movie-pagination" aria-label={`${title} pages`}>
      <button type="button" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span role="status">Page {page + 1} of {pageCount}</span>
      <button type="button" disabled={page + 1 === pageCount} onClick={() => onPageChange(page + 1)}>Next</button>
    </nav>
  );
}
