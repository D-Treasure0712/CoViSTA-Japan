import { PullDownMenuProps } from "@/types/dataType";
import { useState } from "react";


export const PullDownMenu = ({prefectures, selectedPrefecture, setSelectedPrefecture}: PullDownMenuProps) => {
	return (
		<div className="mb-6">
			<label htmlFor="prefecture-select" className="block text-sm font-medium text-black mb-2">
				表示する都道府県を選択
			</label>
			<select
				id="prefecture-select"
				value={selectedPrefecture}
				onChange={(e) => setSelectedPrefecture(e.target.value)}
				className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
			>
				{prefectures.map((prefecture) => (
				<option key={prefecture} value={prefecture} className="text-black">
					{prefecture}
				</option>
				))}
			</select>
		</div>
	)
}