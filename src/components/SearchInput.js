import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

const SearchInput = ({ value = '', onChange, placeholder = 'Buscar...' }) => {
  const [searchValue, setSearchValue] = useState(value);
  const inputRef = useRef(null);

  // Actualizar el valor local cuando cambia la prop value
  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  // Manejar cambios en el input
  const handleChange = (e) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  // Enfocar el input al montar
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        ref={inputRef}
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
        placeholder={placeholder}
        value={searchValue}
        onChange={handleChange}
      />
    </div>
  );
};

export default SearchInput;
