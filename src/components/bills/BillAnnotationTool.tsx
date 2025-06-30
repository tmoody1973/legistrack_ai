import React, { useState } from 'react';
import { MessageSquare, X, Save, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';

interface Annotation {
  id: string;
  text: string;
  position: { start: number; end: number };
  color: string;
  note?: string;
}

interface BillAnnotationToolProps {
  billText: string;
  initialAnnotations?: Annotation[];
  onSave?: (annotations: Annotation[]) => void;
}

export const BillAnnotationTool: React.FC<BillAnnotationToolProps> = ({
  billText,
  initialAnnotations = [],
  onSave
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [selectedText, setSelectedText] = useState<{ text: string; start: number; end: number } | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const [noteText, setNoteText] = useState('');
  const [highlightColor, setHighlightColor] = useState('#FFEB3B'); // Default yellow

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      setSelectedText(null);
      return;
    }
    
    const range = selection.getRangeAt(0);
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    
    setSelectedText({
      text: selection.toString(),
      start: startOffset,
      end: endOffset
    });
  };

  const handleAddAnnotation = () => {
    if (!selectedText) return;
    
    const newAnnotation: Annotation = {
      id: `annotation-${Date.now()}`,
      text: selectedText.text,
      position: { start: selectedText.start, end: selectedText.end },
      color: highlightColor,
      note: noteText || undefined
    };
    
    setAnnotations([...annotations, newAnnotation]);
    setSelectedText(null);
    setNoteText('');
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id));
    setActiveAnnotation(null);
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    setActiveAnnotation(annotation);
    setNoteText(annotation.note || '');
  };

  const handleUpdateNote = () => {
    if (!activeAnnotation) return;
    
    setAnnotations(annotations.map(a => 
      a.id === activeAnnotation.id 
        ? { ...a, note: noteText } 
        : a
    ));
    
    setActiveAnnotation(null);
    setNoteText('');
  };

  const handleSaveAnnotations = () => {
    onSave?.(annotations);
  };

  // Render text with annotations
  const renderAnnotatedText = () => {
    let result = billText;
    let offset = 0;
    
    // Sort annotations by position to process them in order
    const sortedAnnotations = [...annotations].sort((a, b) => a.position.start - b.position.start);
    
    for (const annotation of sortedAnnotations) {
      const { start, end } = annotation.position;
      const adjustedStart = start + offset;
      const adjustedEnd = end + offset;
      
      const before = result.substring(0, adjustedStart);
      const highlighted = result.substring(adjustedStart, adjustedEnd);
      const after = result.substring(adjustedEnd);
      
      const highlightedText = `<span class="annotation" style="background-color: ${annotation.color};" data-id="${annotation.id}">${highlighted}</span>`;
      
      result = before + highlightedText + after;
      
      // Update offset for next annotation
      offset += highlightedText.length - highlighted.length;
    }
    
    return result;
  };

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <button 
              className={`w-6 h-6 rounded-full border border-gray-300 ${highlightColor === '#FFEB3B' ? 'ring-2 ring-primary-500' : ''}`}
              style={{ backgroundColor: '#FFEB3B' }}
              onClick={() => setHighlightColor('#FFEB3B')}
            ></button>
            <button 
              className={`w-6 h-6 rounded-full border border-gray-300 ${highlightColor === '#81C784' ? 'ring-2 ring-primary-500' : ''}`}
              style={{ backgroundColor: '#81C784' }}
              onClick={() => setHighlightColor('#81C784')}
            ></button>
            <button 
              className={`w-6 h-6 rounded-full border border-gray-300 ${highlightColor === '#90CAF9' ? 'ring-2 ring-primary-500' : ''}`}
              style={{ backgroundColor: '#90CAF9' }}
              onClick={() => setHighlightColor('#90CAF9')}
            ></button>
            <button 
              className={`w-6 h-6 rounded-full border border-gray-300 ${highlightColor === '#F48FB1' ? 'ring-2 ring-primary-500' : ''}`}
              style={{ backgroundColor: '#F48FB1' }}
              onClick={() => setHighlightColor('#F48FB1')}
            ></button>
          </div>
          
          <div className="h-6 border-l border-gray-300"></div>
          
          <button 
            className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
            disabled={!selectedText}
            onClick={handleAddAnnotation}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
        
        <Button size="sm" onClick={handleSaveAnnotations}>
          <Save className="w-4 h-4 mr-2" />
          Save Annotations
        </Button>
      </div>
      
      {/* Text Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <div 
          className="prose max-w-none"
          onMouseUp={handleTextSelection}
          dangerouslySetInnerHTML={{ __html: renderAnnotatedText() }}
        ></div>
      </div>
      
      {/* Annotation Panel */}
      <div className="border-t border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Annotations ({annotations.length})</h3>
        
        {activeAnnotation ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: activeAnnotation.color + '40' }}>
              <p className="text-gray-700 font-medium mb-2">"{activeAnnotation.text}"</p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add your note here..."
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
              ></textarea>
            </div>
            
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDeleteAnnotation(activeAnnotation.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button 
                size="sm"
                onClick={handleUpdateNote}
              >
                Save Note
              </Button>
            </div>
          </div>
        ) : selectedText ? (
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <p className="text-gray-700 font-medium mb-2">"{selectedText.text}"</p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add your note here..."
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedText(null)}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleAddAnnotation}
              >
                Add Annotation
              </Button>
            </div>
          </div>
        ) : annotations.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {annotations.map(annotation => (
              <div 
                key={annotation.id}
                className="p-2 rounded-lg cursor-pointer hover:bg-gray-50 flex items-start"
                onClick={() => handleAnnotationClick(annotation)}
              >
                <div 
                  className="w-4 h-4 rounded-full mt-1 mr-2 flex-shrink-0" 
                  style={{ backgroundColor: annotation.color }}
                ></div>
                <div>
                  <p className="text-sm text-gray-700 font-medium">"{annotation.text}"</p>
                  {annotation.note && (
                    <p className="text-xs text-gray-500 mt-1">{annotation.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm italic">
            Select text in the document to add annotations and notes.
          </p>
        )}
      </div>
    </div>
  );
};