type Props = {
  value: string;
  onChange: (value: string) => void;

  categories: string[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
};

function SearchBar({
  value,
  onChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: Props) {
  return (
    <div
      className="
  flex
  flex-col
  gap-3
  sm:flex-row
  sm:items-center
  mb-6
  px-0
"
    >
      {/* SEARCH */}

      <div
        className="
  relative
  flex-1
"
      >
        <div
          className="
 absolute
 inset-y-0
 left-0
 flex
 items-center
 pl-4
 pointer-events-none
"
        >
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6 6a7.5 7.5 0 0 0 10.65 10.65Z"
            />
          </svg>
        </div>

        <input
          type="text"
          placeholder="Search words, translations..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
w-full
rounded-2xl
border
border-line
bg-surface
py-4
pl-12
pr-5
text-lg
text-heading
shadow-sm
focus:outline-none
focus:ring-4
focus:ring-accent-soft
focus:border-accent
transition
"
        />
      </div>

      {/* CATEGORY DROPDOWN */}

      <select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="
rounded-2xl
border
border-line
bg-surface
px-5
py-4
text-heading
shadow-sm
cursor-pointer
focus:outline-none
focus:ring-4
focus:ring-accent-soft
focus:border-accent
"
      >
        <option value="all">All categories</option>

        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SearchBar;
