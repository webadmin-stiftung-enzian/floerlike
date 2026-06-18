import { useBlockProps } from '@wordpress/block-editor';
import './style.scss';

export const Edit = () => {
	const blockProps = useBlockProps();
	return (
		<div { ...blockProps }>
			Greeting Card Block – Editor Platzhalter
		</div>
	);
};

export const Save = () => {
	return null;
};
