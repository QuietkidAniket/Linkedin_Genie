import json
import re
from typing import Dict, Tuple, Any
import logging

logger = logging.getLogger(__name__)

class LLMQueryParser:
    """Simple rule-based query parser (fallback without LLM)"""
    
    def __init__(self):
        self.company_keywords = ['google', 'microsoft', 'apple', 'amazon', 'meta', 'facebook', 'netflix', 'tesla', 'uber', 'airbnb']
        self.position_keywords = ['engineer', 'manager', 'director', 'analyst', 'consultant', 'developer', 'designer', 'product', 'data', 'software']
        self.location_keywords = ['san francisco', 'new york', 'seattle', 'london', 'bangalore', 'toronto', 'berlin', 'sydney']
    
    def parse_query(self, query: str) -> Tuple[Dict[str, Any], str]:
        """Parse natural language query into filter parameters"""
        try:
            query_lower = query.lower()
            filters = {}
            explanations = []
            
            # Extract companies
            companies = []
            for company in self.company_keywords:
                if company in query_lower:
                    companies.append(company.title())
            
            # Look for other company patterns
            company_patterns = [
                r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:engineers?|employees?|workers?)',
                r'(?:at|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:company|corp|inc)'
            ]
            
            for pattern in company_patterns:
                matches = re.findall(pattern, query)
                for match in matches:
                    if match not in companies and len(match) > 2:
                        companies.append(match)
            
            if companies:
                filters['companies'] = companies
                explanations.append(f"filtering by companies: {', '.join(companies)}")
            
            # Extract positions
            positions = []
            for position in self.position_keywords:
                if position in query_lower:
                    positions.append(position)
            
            # Look for position patterns
            position_patterns = [
                r'\b(software|data|product|marketing|sales|finance)\s+(engineer|manager|analyst|scientist)',
                r'\b(senior|junior|lead|principal)\s+(engineer|manager|developer)',
                r'\b(cto|ceo|vp|director)\b'
            ]
            
            for pattern in position_patterns:
                matches = re.findall(pattern, query_lower)
                for match in matches:
                    position = ' '.join(match) if isinstance(match, tuple) else match
                    if position not in positions:
                        positions.append(position)
            
            if positions:
                filters['positions'] = positions
                explanations.append(f"filtering by positions: {', '.join(positions)}")
            
            # Extract locations
            locations = []
            for location in self.location_keywords:
                if location in query_lower:
                    locations.append(location.title())
            
            # Look for location patterns
            location_patterns = [
                r'in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                r'from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                r'based\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
            ]
            
            for pattern in location_patterns:
                matches = re.findall(pattern, query)
                for match in matches:
                    if match not in locations and len(match) > 2:
                        locations.append(match)
            
            if locations:
                filters['location'] = locations[0]  # Take first location
                explanations.append(f"filtering by location: {locations[0]}")
            
            # Extract connection requirements
            connection_patterns = [
                r'(?:with|having)\s+(?:many|lots?\s+of|high|more\s+than\s+(\d+))\s+connections?',
                r'(?:top|most)\s+connect(?:ed|ors?)',
                r'(?:highly|well)\s+connect(?:ed|ors?)',
                r'min(?:imum)?\s+(\d+)\s+connections?'
            ]
            
            for pattern in connection_patterns:
                matches = re.findall(pattern, query_lower)
                if matches:
                    if any(matches[0] for match in matches if match):
                        # Extract specific number
                        numbers = [int(match) for match in matches if match.isdigit()]
                        if numbers:
                            filters['min_degree'] = numbers[0]
                            explanations.append(f"minimum {numbers[0]} connections")
                    else:
                        # General "many connections" - use threshold
                        filters['min_degree'] = 5
                        explanations.append("filtering for highly connected people (5+ connections)")
            
            # Handle superlatives and rankings
            if any(word in query_lower for word in ['top', 'most', 'best', 'leading', 'influential']):
                if 'min_degree' not in filters:
                    filters['min_degree'] = 3
                    explanations.append("showing top connected people")
            
            # Generate explanation
            if explanations:
                explanation = f"Applied filters: {'; '.join(explanations)}"
            else:
                explanation = "No specific filters detected. Showing full network."
            
            logger.info(f"Parsed query '{query}' -> filters: {filters}")
            
            return filters, explanation
            
        except Exception as e:
            logger.error(f"Error parsing query: {str(e)}")
            return {}, f"Error parsing query: {str(e)}"