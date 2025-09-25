import json
import re
from typing import Dict, Tuple, Any, Optional
import logging
import os
from groq import Groq

logger = logging.getLogger(__name__)

class GroqQueryParser:
    """Groq-powered natural language query parser with fallback"""
    
    def __init__(self):
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        self.client = None
        
        if self.groq_api_key:
            try:
                self.client = Groq(api_key=self.groq_api_key)
                logger.info("Groq client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client: {e}")
                self.client = None
        else:
            logger.warning("GROQ_API_KEY not found, using fallback parser only")
        
        # Fallback parser keywords
        self.company_keywords = [
            'google', 'microsoft', 'apple', 'amazon', 'meta', 'facebook', 
            'netflix', 'tesla', 'uber', 'airbnb', 'linkedin', 'twitter',
            'salesforce', 'oracle', 'ibm', 'intel', 'nvidia', 'adobe',
            'spotify', 'slack', 'zoom', 'dropbox', 'stripe', 'paypal'
        ]
        
        self.position_keywords = [
            'engineer', 'manager', 'director', 'analyst', 'consultant', 
            'developer', 'designer', 'product', 'data', 'software',
            'marketing', 'sales', 'finance', 'operations', 'hr',
            'cto', 'ceo', 'vp', 'senior', 'junior', 'lead', 'principal'
        ]
        
        self.location_keywords = [
            'san francisco', 'new york', 'seattle', 'london', 'bangalore',
            'toronto', 'berlin', 'sydney', 'mumbai', 'delhi', 'hyderabad',
            'chennai', 'pune', 'boston', 'chicago', 'los angeles', 'austin'
        ]
    
    async def parse_query(self, query: str) -> Tuple[Dict[str, Any], str]:
        """Parse natural language query into filter parameters"""
        try:
            # Try Groq first if available
            if self.client:
                try:
                    groq_result = await self._parse_with_groq(query)
                    if groq_result:
                        return groq_result
                except Exception as e:
                    logger.warning(f"Groq parsing failed, falling back to rule-based: {e}")
            
            # Fallback to rule-based parsing
            return self._parse_with_rules(query)
            
        except Exception as e:
            logger.error(f"Error parsing query: {str(e)}")
            return {}, f"Error parsing query: {str(e)}"
    
    async def _parse_with_groq(self, query: str) -> Optional[Tuple[Dict[str, Any], str]]:
        """Parse query using Groq API"""
        prompt = f"""You are a structured JSON generator for a professional network. Given a user question, return ONLY a JSON with optional keys:
- companies (array of strings)
- positions (array of strings) 
- location (string)
- min_degree (int)
- date_from (YYYY-MM-DD)
- date_to (YYYY-MM-DD)
- explain (string that explains what the filter does)

Example:
Q: "Show Google engineers in Bangalore with many connections"
-->
{{"companies":["Google"],"positions":["engineer"],"location":"Bangalore","min_degree":3,"explain":"Google engineers in Bangalore with degree >= 3"}}

Question: {query}"""

        try:
            response = self.client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                filter_data = json.loads(json_str)
                
                # Validate the structure
                valid_keys = {'companies', 'positions', 'location', 'min_degree', 'date_from', 'date_to', 'explain'}
                filtered_data = {k: v for k, v in filter_data.items() if k in valid_keys}
                
                explanation = filtered_data.pop('explain', 'Applied AI-generated filters')
                
                logger.info(f"Groq parsed query '{query}' -> {filtered_data}")
                return filtered_data, explanation
            
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return None
        
        return None
    
    def _parse_with_rules(self, query: str) -> Tuple[Dict[str, Any], str]:
        """Fallback rule-based query parser"""
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
                if any(match for match in matches if match and match.isdigit()):
                    # Extract specific number
                    numbers = [int(match) for match in matches if match and match.isdigit()]
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
        
        logger.info(f"Rule-based parsed query '{query}' -> filters: {filters}")
        
        return filters, explanation